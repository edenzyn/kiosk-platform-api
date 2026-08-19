import type jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ClientTypeEnum } from "../../shared/enums/core/client-type.enum";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import {
  compareHashedData,
  hashData,
} from "../../shared/utils/core/bcrypt.helper";
import { hashSha256 } from "../../shared/utils/core/crypto.helper";
import { generateToken, verifyToken } from "../../shared/utils/core/jwt.helper";
import { getUserScope } from "../../shared/utils/user/user-scope.helper";
import type { DeviceRepository } from "../device/device.repository";
import type { LicenseService } from "../license/license.service";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { UserInvitationEntity } from "../user/schemas/user-invitations.schema";
import type { UserEntity } from "../user/schemas/user.schema";
import type { UserRepository } from "../user/user.repository";
import type { UserService } from "../user/user.service";
import type { AuthRepository } from "./auth.repository";
import type {
  AcceptInvitationServiceInput,
  AcceptInvitationServiceResult,
  AcceptResellerInvitationServiceInput,
  AcceptResellerInvitationServiceResult,
  LoginDeviceServiceInput,
  LoginDeviceServiceResult,
  LoginPlatformUserServiceInput,
  LoginPlatformUserServiceResult,
  LoginResellerServiceInput,
  LoginResellerServiceResult,
  LoginServiceInput,
  LoginServiceResult,
  LogoutServiceResult,
  RefreshTokenServiceResult,
} from "./auth.types";

interface RefreshTokenPayload extends jwt.JwtPayload {
  user?: { id: string };
  device?: { id: string };
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly userService: UserService,
    private readonly deviceRepository: DeviceRepository,
    private readonly licenseService: LicenseService,
  ) {}

  private _generateTokens(
    entityType: ClientTypeEnum,
    payload: {
      user?: UserTokenDto;
      device?: DeviceTokenDto;
    },
    customRefreshExp?: number,
  ): { accessToken: string; refreshToken: string; refreshTokenId: string } {
    const isDevice = entityType === ClientTypeEnum.DEVICE_CLIENT;
    const accessExpiresIn = (
      isDevice ? env.JWT_DEVICE_ACCESS_EXPIRES_IN : env.JWT_ACCESS_EXPIRES_IN
    ) as jwt.SignOptions["expiresIn"];

    const accessToken = generateToken(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: accessExpiresIn as jwt.SignOptions["expiresIn"],
    });
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
      refreshTokenOptions.expiresIn = (
        isDevice
          ? env.JWT_DEVICE_REFRESH_EXPIRES_IN
          : env.JWT_REFRESH_EXPIRES_IN
      ) as jwt.SignOptions["expiresIn"];
    }

    const refreshToken = generateToken(
      payload,
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

  private async _authenticateUser(
    email: string,
    password: string,
    hooks: {
      beforePasswordCheck?: (user: UserEntity) => void;
      afterPasswordCheck?: (user: UserEntity) => void;
    } = {},
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ email });

    if (!user) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    hooks.beforePasswordCheck?.(user);

    const isMatch = await compareHashedData(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    hooks.afterPasswordCheck?.(user);

    if (!user.isActive) {
      throw new AppError(
        "Your account has been deactivated. Please contact your administrator.",
        {
          statusCode: HttpStatusCodes.FORBIDDEN,
        },
      );
    }

    return user;
  }

  private async _issueUserSessionTokens(user: {
    id: string;
    organizationId?: string | null;
    branchId?: string | null;
    userType: UserTypeEnums;
  }) {
    const generatedTokens = this._generateTokens(ClientTypeEnum.USER_CLIENT, {
      user: {
        id: user.id,
        organizationId: user.organizationId ?? undefined,
        branchId: user.branchId ?? undefined,
        userType: user.userType,
      },
    });

    await this.authRepository.createRefreshToken({
      data: {
        id: generatedTokens.refreshTokenId,
        userId: user.id,
        tokenHash: hashSha256(generatedTokens.refreshToken),
        expiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
      },
    });

    return {
      accessToken: generatedTokens.accessToken,
      refreshToken: generatedTokens.refreshToken,
    };
  }

  private async _getUserPermissionKeys(
    userId: string,
  ): Promise<UserPermissions[]> {
    const permissionKeys = await this.rbacRepository.findUserPermissionKeys({
      userId,
    });
    return Array.from(permissionKeys) as UserPermissions[];
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async loginUser(dto: LoginServiceInput): Promise<LoginServiceResult> {
    const user = await this._authenticateUser(dto.email, dto.password, {
      afterPasswordCheck: (user) => {
        if (user.userType === UserTypeEnums.PLATFORM) {
          throw new AppError(
            "Platform users must sign in through the platform portal",
            {
              statusCode: HttpStatusCodes.FORBIDDEN,
            },
          );
        }

        if (user.userType === UserTypeEnums.RESELLER) {
          throw new AppError(
            "Resellers must sign in through the reseller portal",
            {
              statusCode: HttpStatusCodes.FORBIDDEN,
            },
          );
        }
      },
    });

    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user);
    const settings = await this.userService.getOrCreateSettings(user.id);

    const userScope = getUserScope(user);

    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        user.id,
        user.organizationId,
        user.branchId,
        userScope,
      );

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens,
      permissions,
      availableScopes,
      settings,
    };
  }

  // Platform user login (SuperAdmin)
  async loginPlatformUser(
    dto: LoginPlatformUserServiceInput,
  ): Promise<LoginPlatformUserServiceResult> {
    const user = await this._authenticateUser(dto.email, dto.password, {
      beforePasswordCheck: (user) => {
        if (
          user.userType !== UserTypeEnums.PLATFORM ||
          !!user.organizationId ||
          !!user.branchId
        ) {
          throw new AppError("Access Denied, You are not a platform user", {
            statusCode: HttpStatusCodes.FORBIDDEN,
          });
        }
      },
    });

    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user);
    const permissions = await this._getUserPermissionKeys(user.id);
    const settings = await this.userService.getOrCreateSettings(user.id);

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens,
      permissions,
      settings,
    };
  }

  // Reseller login
  async loginReseller(
    dto: LoginResellerServiceInput,
  ): Promise<LoginResellerServiceResult> {
    const user = await this._authenticateUser(dto.email, dto.password, {
      beforePasswordCheck: (user) => {
        if (user.userType !== UserTypeEnums.RESELLER) {
          throw new AppError("Access Denied, You are not a reseller", {
            statusCode: HttpStatusCodes.FORBIDDEN,
          });
        }
      },
    });

    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user);
    const permissions = await this._getUserPermissionKeys(user.id);
    const settings = await this.userService.getOrCreateSettings(user.id);

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens,
      permissions,
      settings,
    };
  }

  async logout(refreshToken: string): Promise<LogoutServiceResult> {
    try {
      const decoded = verifyToken<RefreshTokenPayload>(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      );
      if (decoded.jti) {
        await this.authRepository.revokeRefreshToken({
          tokenId: decoded.jti,
          tokenHash: hashSha256(refreshToken),
        });
      }
      return true;
    } catch {
      // Logout is intentionally idempotent, including for expired tokens.
      return false;
    }
  }

  private async _verifyAndGetPendingInvitation(
    token: string,
  ): Promise<UserInvitationEntity> {
    try {
      verifyToken(token, env.JWT_INVITE_USER_SECRET);
    } catch (error) {
      throw new AppError("Invalid or expired invitation.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const invitation = await this.userRepository.findOneInvitation({
      token,
    });
    if (!invitation) {
      throw new AppError("Invitation not found.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.PENDING) {
      switch (invitation.status) {
        case UserInvitationStatusEnum.ACCEPTED:
          throw new AppError("This invitation has already been accepted.", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
          });
        case UserInvitationStatusEnum.REVOKED:
          throw new AppError("This invitation has been revoked.", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
          });
        case UserInvitationStatusEnum.EXPIRED:
          throw new AppError("This invitation has expired.", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
          });
        default:
          throw new AppError("This invitation is no longer valid.", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
          });
      }
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await this.userRepository.updateInvitation({
        id: invitation.id,
        data: {
          status: UserInvitationStatusEnum.EXPIRED,
          updatedBy: invitation.id,
        },
      });
      throw new AppError("Invitation has expired.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    return invitation;
  }

  async acceptInvitation(
    dto: AcceptInvitationServiceInput,
  ): Promise<AcceptInvitationServiceResult> {
    const invitation = await this._verifyAndGetPendingInvitation(dto.token);

    const existingUser = await this.userRepository.findOne({
      email: invitation.email,
    });
    if (existingUser) {
      throw new AppError("Email already registered", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const hashedPassword = await hashData(dto.password);

    const createdUser = await this.userRepository.create({
      user: {
        name: dto.name,
        email: invitation.email,
        password: hashedPassword,
        organizationId: invitation.organizationId,
        branchId: invitation.branchId,
        userType: UserTypeEnums.NORMAL,
      },
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

    const userScope = getUserScope(createdUser);

    // Assign scope-specific basic permission to the user
    const basicPermissionKey =
      userScope === UserScopeTypeEnums.BRANCH
        ? UserPermissions.BRANCH_BASIC
        : UserPermissions.ORGANIZATION_BASIC;

    const [basicPerm] = await this.rbacRepository.findPermissionsByKeys({
      keys: [basicPermissionKey],
    });

    if (basicPerm) {
      await this.rbacRepository.createPermissionMapper({
        entityType: PermissionEntityType.USER,
        entityId: createdUser.id,
        permissionId: basicPerm.id,
        organizationId: createdUser.organizationId,
        branchId: createdUser.branchId,
        createdBy: createdUser.id,
      });
    }

    await this.userRepository.updateInvitation({
      id: invitation.id,
      data: {
        status: UserInvitationStatusEnum.ACCEPTED,
        updatedBy: createdUser.id,
      },
    });

    const tokens = this._generateTokens(ClientTypeEnum.USER_CLIENT, {
      user: {
        id: createdUser.id,
        organizationId: createdUser.organizationId ?? undefined,
        branchId: createdUser.branchId ?? undefined,
        userType: createdUser.userType,
      },
    });

    await this.authRepository.createRefreshToken({
      data: {
        id: tokens.refreshTokenId,
        userId: createdUser.id,
        tokenHash: hashSha256(tokens.refreshToken),
        expiresAt: this._getRefreshTokenExpiry(tokens.refreshToken),
      },
    });

    const { password, ...userWithoutPassword } = createdUser;

    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        createdUser.id,
        createdUser.organizationId,
        createdUser.branchId,
        userScope,
      );
    const settings = await this.userService.getOrCreateSettings(
      createdUser.id,
    );

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      permissions,
      availableScopes,
      settings,
    };
  }

  async acceptResellerInvitation(
    dto: AcceptResellerInvitationServiceInput,
  ): Promise<AcceptResellerInvitationServiceResult> {
    const invitation = await this._verifyAndGetPendingInvitation(dto.token);

    if (invitation.entityType !== UserTypeEnums.RESELLER) {
      throw new AppError("This invitation is not a reseller invitation.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const existingUser = await this.userRepository.findOne({
      email: invitation.email,
    });
    if (existingUser) {
      throw new AppError("Email already registered", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const hashedPassword = await hashData(dto.password);

    const createdUser = await this.userRepository.create({
      user: {
        name: dto.name,
        email: invitation.email,
        password: hashedPassword,
        organizationId: null,
        branchId: null,
        userType: UserTypeEnums.RESELLER,
      },
    });

    const [basicPerm] = await this.rbacRepository.findPermissionsByKeys({
      keys: [UserPermissions.RESELLER_BASIC],
    });

    if (basicPerm) {
      await this.rbacRepository.createPermissionMapper({
        entityType: PermissionEntityType.USER,
        entityId: createdUser.id,
        permissionId: basicPerm.id,
        organizationId: null,
        branchId: null,
        createdBy: createdUser.id,
      });
    }

    await this.userRepository.updateInvitation({
      id: invitation.id,
      data: {
        status: UserInvitationStatusEnum.ACCEPTED,
        updatedBy: createdUser.id,
      },
    });

    const tokens = this._generateTokens(ClientTypeEnum.USER_CLIENT, {
      user: {
        id: createdUser.id,
        organizationId: undefined,
        branchId: undefined,
        userType: createdUser.userType,
      },
    });

    await this.authRepository.createRefreshToken({
      data: {
        id: tokens.refreshTokenId,
        userId: createdUser.id,
        tokenHash: hashSha256(tokens.refreshToken),
        expiresAt: this._getRefreshTokenExpiry(tokens.refreshToken),
      },
    });

    const { password, ...userWithoutPassword } = createdUser;

    const { permissions } = await this.userService.getPermissionsAndScopes(
      createdUser.id,
      null,
      null,
    );
    const settings = await this.userService.getOrCreateSettings(
      createdUser.id,
    );

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      permissions,
      availableScopes: [],
      settings,
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenServiceResult> {
    try {
      const decoded = verifyToken<RefreshTokenPayload>(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      );

      if (!decoded.jti) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      if (decoded.device?.id) {
        const device = await this.deviceRepository.findOne({
          id: decoded.device.id,
        });
        if (!device || !device.isActive) {
          throw new AppError("Invalid or expired refresh token", {
            statusCode: HttpStatusCodes.UNAUTHORIZED,
            code: ErrorCodes.UNAUTHORIZED,
          });
        }

        const customRefreshExp = env.JWT_REFRESH_SLIDING_ENABLED
          ? undefined
          : decoded.exp;

        const generatedTokens = this._generateTokens(
          ClientTypeEnum.DEVICE_CLIENT,
          {
            device: {
              id: device.id,
              organizationId: device.organizationId,
              branchId: device.branchId,
              type: device.deviceType,
              deviceCode: device.deviceCode!,
            },
          },
          customRefreshExp,
        );

        const rotated = await this.authRepository.rotateRefreshToken({
          currentTokenId: decoded.jti,
          currentTokenHash: hashSha256(refreshToken),
          replacement: {
            id: generatedTokens.refreshTokenId,
            deviceId: device.id,
            userId: null,
            tokenHash: hashSha256(generatedTokens.refreshToken),
            expiresAt: this._getRefreshTokenExpiry(
              generatedTokens.refreshToken,
            ),
          },
        });

        if (!rotated) {
          throw new AppError("Invalid or expired refresh token", {
            statusCode: HttpStatusCodes.UNAUTHORIZED,
            code: ErrorCodes.UNAUTHORIZED,
          });
        }

        const tokens = {
          accessToken: generatedTokens.accessToken,
          refreshToken: generatedTokens.refreshToken,
        };

        const { pin, ...deviceWithoutPin } = device;
        const licenseInfo = await this.licenseService.getLicenseForDevice({
          deviceId: device.id,
        });

        return {
          clientType: ClientTypeEnum.DEVICE_CLIENT,
          tokens,
          device: deviceWithoutPin,
          license: licenseInfo.license,
        };
      }

      if (!decoded.user?.id) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      const user = await this.userRepository.findOne({ id: decoded.user.id });
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

      const generatedTokens = this._generateTokens(
        ClientTypeEnum.USER_CLIENT,
        {
          user: {
            id: user.id,
            organizationId: user.organizationId ?? undefined,
            branchId: user.branchId ?? undefined,
            userType: user.userType,
          },
        },
        customRefreshExp,
      );

      const rotated = await this.authRepository.rotateRefreshToken({
        currentTokenId: decoded.jti,
        currentTokenHash: hashSha256(refreshToken),
        replacement: {
          id: generatedTokens.refreshTokenId,
          userId: user.id,
          deviceId: null,
          tokenHash: hashSha256(generatedTokens.refreshToken),
          expiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
        },
      });

      if (!rotated) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

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
      const settings = await this.userService.getOrCreateSettings(user.id);

      return {
        clientType: ClientTypeEnum.USER_CLIENT,
        tokens,
        user: userWithoutPassword,
        permissions,
        settings,
        availableScopes,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired refresh token", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
  }

  // ========================================
  // ? DEVICE CLIENT SERVICES
  // ========================================
  async loginDevice(
    dto: LoginDeviceServiceInput,
  ): Promise<LoginDeviceServiceResult> {
    const device = await this.deviceRepository.findOne({
      deviceCode: dto.deviceCode,
    });

    if (!device) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    if (!device.isActive) {
      throw new AppError(
        "Device is deactivated. Please contact your administrator.",
        {
          statusCode: HttpStatusCodes.FORBIDDEN,
        },
      );
    }

    const isMatch = await compareHashedData(String(dto.pin), device.pin);
    if (!isMatch) {
      throw new AppError("Incorrect PIN", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const generatedTokens = this._generateTokens(ClientTypeEnum.DEVICE_CLIENT, {
      device: {
        id: device.id,
        organizationId: device.organizationId,
        branchId: device.branchId,
        type: device.deviceType,
        deviceCode: device.deviceCode!,
      },
    });

    await this.authRepository.createRefreshToken({
      data: {
        id: generatedTokens.refreshTokenId,
        userId: null,
        deviceId: device.id,
        tokenHash: hashSha256(generatedTokens.refreshToken),
        expiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
      },
    });

    const { pin, ...deviceWithoutPin } = device;

    const licenseInfo = await this.licenseService.getLicenseForDevice({
      deviceId: device.id,
    });

    return {
      clientType: ClientTypeEnum.DEVICE_CLIENT,
      device: deviceWithoutPin,
      tokens: {
        accessToken: generatedTokens.accessToken,
        refreshToken: generatedTokens.refreshToken,
      },
      license: licenseInfo.license,
    };
  }
}
