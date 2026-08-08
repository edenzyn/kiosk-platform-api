import type jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { getUserScope } from "../../shared/utils/user/user-scope.helper";
import {
  compareHashedData,
  hashData,
} from "../../shared/utils/core/bcrypt.helper";
import { hashSha256 } from "../../shared/utils/core/crypto.helper";
import { generateToken, verifyToken } from "../../shared/utils/core/jwt.helper";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { UserRepository } from "../user/user.repository";
import type { UserService } from "../user/user.service";
import type { AuthRepository } from "./auth.repository";
import type { AcceptInvitationRequestDto } from "./dtos/accept-invitation-request.dto";
import type { LoginResult } from "./dtos/login-result.dto";
import type { LoginUserRequestDto } from "./dtos/login-user-request.dto";

interface RefreshTokenPayload extends jwt.JwtPayload {
  user?: { id: string };
  jti?: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly userService: UserService,
  ) {}

  private _generateAuthTokens(
    id: string,
    organizationId?: string | null,
    branchId?: string | null,
    customRefreshExp?: number,
  ): { accessToken: string; refreshToken: string; refreshTokenId: string } {
    const userPayload = {
      id,
      ...(organizationId && { organizationId }),
      ...(branchId && { branchId }),
    };
    const accessToken = generateToken(
      { user: userPayload },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    const refreshTokenId = randomUUID();

    const refreshTokenOptions: jwt.SignOptions = {
      jwtid: refreshTokenId,
    };

    if (customRefreshExp) {
      const remainingSeconds = Math.max(
        0,
        customRefreshExp - Math.floor(Date.now() / 1000),
      );
      refreshTokenOptions.expiresIn = remainingSeconds;
    } else {
      refreshTokenOptions.expiresIn =
        env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"];
    }

    const refreshToken = generateToken(
      { user: userPayload },
      env.JWT_REFRESH_SECRET,
      refreshTokenOptions,
    );

    return { accessToken, refreshToken, refreshTokenId };
  }

  private _getRefreshTokenExpiry(token: string): Date {
    const decoded = verifyToken<RefreshTokenPayload>(
      token,
      env.JWT_REFRESH_SECRET,
    );
    if (!decoded.exp) throw new Error("Refresh token has no expiry");
    return new Date(decoded.exp * 1000);
  }

  async loginUser(dto: LoginUserRequestDto): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const isMatch = await compareHashedData(dto.password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const { password, ...userWithoutPassword } = user;
    const generatedTokens = this._generateAuthTokens(
      user.id,
      user.organizationId,
      user.branchId,
    );

    await this.authRepository.createRefreshToken({
      id: generatedTokens.refreshTokenId,
      userId: user.id,
      tokenHash: hashSha256(generatedTokens.refreshToken),
      expiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
    });

    const tokens = {
      accessToken: generatedTokens.accessToken,
      refreshToken: generatedTokens.refreshToken,
    };

    const userScope = getUserScope(user);

    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        user.id,
        user.organizationId,
        user.branchId,
        userScope,
      );

    return { user: userWithoutPassword, tokens, permissions, availableScopes };
  }

  async refreshUserToken(refreshToken: string): Promise<LoginResult> {
    try {
      const decoded = verifyToken<RefreshTokenPayload>(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      );

      if (!decoded.user?.id || !decoded.jti) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      const user = await this.userRepository.findById(decoded.user.id);
      if (!user) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      const { password, ...userWithoutPassword } = user;

      const customRefreshExp = env.JWT_REFRESH_SLIDING_ENABLED
        ? undefined
        : decoded.exp;

      const generatedTokens = this._generateAuthTokens(
        user.id,
        user.organizationId,
        user.branchId,
        customRefreshExp,
      );

      const rotated = await this.authRepository.rotateRefreshToken(
        decoded.jti,
        hashSha256(refreshToken),
        {
          id: generatedTokens.refreshTokenId,
          userId: user.id,
          tokenHash: hashSha256(generatedTokens.refreshToken),
          expiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
        },
      );

      if (!rotated) {
        throw new Error("Refresh token was already used or revoked");
      }

      const userScope = getUserScope(user);

      const { permissions, availableScopes } =
        await this.userService.getPermissionsAndScopes(
          user.id,
          user.organizationId,
          user.branchId,
          userScope,
        );

      return {
        user: userWithoutPassword,
        tokens: {
          accessToken: generatedTokens.accessToken,
          refreshToken: generatedTokens.refreshToken,
        },
        permissions,
        availableScopes,
      };
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
  }

  async logoutUser(refreshToken: string): Promise<void> {
    try {
      const decoded = verifyToken<RefreshTokenPayload>(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      );
      if (decoded.jti) {
        await this.authRepository.revokeRefreshToken(
          decoded.jti,
          hashSha256(refreshToken),
        );
      }
    } catch {
      // Logout is intentionally idempotent, including for expired tokens.
    }
  }

  async acceptInvitation(
    dto: AcceptInvitationRequestDto,
  ): Promise<LoginResult> {
    try {
      verifyToken(dto.token, env.JWT_INVITE_USER_SECRET);
    } catch (error) {
      throw new AppError("Invalid or expired invitation.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const invitation = await this.userRepository.findInvitationByToken(
      dto.token,
    );
    if (!invitation) {
      throw new AppError("Invitation not found.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.PENDING) {
      if (invitation.status === UserInvitationStatusEnum.ACCEPTED) {
        throw new AppError("This invitation has already been accepted.", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }
      if (invitation.status === UserInvitationStatusEnum.REVOKED) {
        throw new AppError("This invitation has been revoked.", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }
      if (invitation.status === UserInvitationStatusEnum.EXPIRED) {
        throw new AppError("This invitation has expired.", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }
      throw new AppError("This invitation is no longer valid.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.userRepository.updateInvitationStatus(
        invitation.id,
        UserInvitationStatusEnum.EXPIRED,
        invitation.id,
      );
      throw new AppError("Invitation has expired.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const existingUser = await this.userRepository.findByEmail(
      invitation.email,
    );
    if (existingUser) {
      throw new AppError("Email already registered", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const hashedPassword = await hashData(dto.password);

    const createdUser = await this.userRepository.create({
      name: dto.name,
      email: invitation.email,
      password: hashedPassword,
      organizationId: invitation.organizationId,
      branchId: invitation.branchId,
      userType: UserTypeEnums.NORMAL,
    });

    if (invitation.roleIds && invitation.roleIds.length > 0) {
      for (const roleId of invitation.roleIds) {
        await this.rbacRepository.createUserRoleMapper({
          userId: createdUser.id,
          roleId: roleId,
          createdBy: createdUser.id,
        });
      }
    }

    await this.userRepository.updateInvitationStatus(
      invitation.id,
      UserInvitationStatusEnum.ACCEPTED,
      createdUser.id,
    );

    const tokens = this._generateAuthTokens(
      createdUser.id,
      createdUser.organizationId,
      createdUser.branchId,
    );

    await this.authRepository.createRefreshToken({
      id: tokens.refreshTokenId,
      userId: createdUser.id,
      tokenHash: hashSha256(tokens.refreshToken),
      expiresAt: this._getRefreshTokenExpiry(tokens.refreshToken),
    });

    const { password, ...userWithoutPassword } = createdUser;

    const userScope = getUserScope(createdUser);

    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        createdUser.id,
        createdUser.organizationId,
        createdUser.branchId,
        userScope,
      );

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      permissions,
      availableScopes,
    };
  }
}
