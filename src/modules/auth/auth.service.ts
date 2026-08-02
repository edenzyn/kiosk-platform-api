import type jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserTypeEnums } from "../../shared/enums/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { compareHashedData, hashData } from "../../shared/utils/bcrypt.helper";
import { hashSha256 } from "../../shared/utils/crypto.helper";
import { generateToken, verifyToken } from "../../shared/utils/jwt.helper";
import type { UserRepository } from "../user/user.repository";
import type { AuthRepository } from "./auth.repository";
import type { LoginResult } from "./dtos/login-result.dto";
import type { LoginUserRequestDto } from "./dtos/login-user-request.dto";
import type { RegisterUserRequestDto } from "./dtos/register-user-request.dto";
import type { RegisterUserResponseDto } from "./dtos/register-user-response.dto";

interface RefreshTokenPayload extends jwt.JwtPayload {
  user?: { id: string };
  jti?: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  private _generateAuthTokens(
    id: string,
    organizationId?: string | null,
    branchId?: string | null,
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
    const refreshToken = generateToken(
      { user: userPayload },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        jwtid: refreshTokenId,
      },
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

  async register(
    dto: RegisterUserRequestDto,
  ): Promise<RegisterUserResponseDto> {
    const existingUserByEmail = await this.userRepository.findByEmail(
      dto.email,
    );
    if (existingUserByEmail) {
      throw new AppError("Email is already registered", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const passwordHash = await hashData(dto.password);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      userType: UserTypeEnums.NORMAL,
    });

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
  }

  async login(dto: LoginUserRequestDto): Promise<LoginResult> {
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

    return { user: userWithoutPassword, tokens };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
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

      const generatedTokens = this._generateAuthTokens(
        user.id,
        user.organizationId,
        user.branchId,
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

      return {
        user: userWithoutPassword,
        tokens: {
          accessToken: generatedTokens.accessToken,
          refreshToken: generatedTokens.refreshToken,
        },
      };
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
  }

  async logout(refreshToken: string): Promise<void> {
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
}
