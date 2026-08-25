import type jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { DEFAULT_ORGANIZATION_ROLES } from "../../../shared/constants/user-role.constants";
import {
  WHATSAPP_TEMPLATE_LANGUAGES,
  WHATSAPP_TEMPLATES,
} from "../../../shared/constants/whatsapp-templates.constants";
import type { DeviceTokenDto } from "../../../shared/dtos/device-token.dto";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import { ClientTypeEnum } from "../../../shared/enums/core/client-type.enum";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { NotificationChannelEnum } from "../../../shared/enums/notification/notification-channel.enum";
import { OneTimeTokenTypeEnum } from "../../../shared/enums/one-time-token/one-time-token-type.enum";
import { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserInvitationStatusEnum } from "../../../shared/enums/user/user-invitation-status.enum";
import { UserScopeTypeEnums } from "../../../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  getSessionLimitForUserType,
  isSessionAutoLogoutEnabled,
} from "../../../shared/utils/auth/auth-session.helper";
import { isTenantActiveCheck } from "../../../shared/utils/auth/tenant-active-check.helper";
import {
  compareHashedData,
  hashData,
} from "../../../shared/utils/core/bcrypt.helper";
import { hashSha256 } from "../../../shared/utils/core/crypto.helper";
import {
  generateToken,
  verifyToken,
} from "../../../shared/utils/core/jwt.helper";
import { pluralizeByCount } from "../../../shared/utils/core/string.helper";
import { getUserScope } from "../../../shared/utils/user/user-scope.helper";
import type { BranchRepository } from "../../branch/branch.repository";
import type { DeviceRepository } from "../../device/device.repository";
import type { LicenseService } from "../../license/services/license.service";
import { getForgotPasswordTemplate } from "../../notification/channels/email/templates/forgot-password.template";
import type { NotificationService } from "../../notification/notification.service";
import type { OrganizationRepository } from "../../organization/organization.repository";
import type { RbacRepository } from "../../rbac/rbac.repository";
import type { UserInvitationEntity } from "../../user/schemas/user-invitations.schema";
import type { UserEntity } from "../../user/schemas/user.schema";
import type { UserRepository } from "../../user/user.repository";
import type { UserService } from "../../user/user.service";
import type { AuthRepository } from "../auth.repository";
import type {
  AcceptInvitationServiceInput,
  AcceptInvitationServiceResult,
  AcceptOrganizationInvitationServiceInput,
  AcceptOrganizationInvitationServiceResult,
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
  RequiresTwoFactorServiceResult,
  SessionMeta,
  VerifyTwoFactorLoginServiceResult,
} from "../auth.types";
import type {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
} from "../dtos/forgot-password.dtos";
import type { OneTimeTokenService } from "./one-time-token.service";
import type { TwoFactorService } from "./two-factor.service";

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
    private readonly twoFactorService: TwoFactorService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly branchRepository: BranchRepository,
    private readonly oneTimeTokenService: OneTimeTokenService,
    private readonly notificationService: NotificationService,
  ) {}

  private _generateTokens(
    entityType: ClientTypeEnum,
    payload: {
      user?: UserTokenDto;
      device?: DeviceTokenDto;
    },
    customRefreshExp?: number,
    // Reuse an existing session id on rotation so the jti — and the
    // auth_sessions row it maps to — stays stable for the life of the
    // session, instead of a new row being minted on every refresh.
    sessionId?: string,
  ): { accessToken: string; refreshToken: string; refreshTokenId: string } {
    const isDevice = entityType === ClientTypeEnum.DEVICE_CLIENT;
    const accessExpiresIn = (
      isDevice ? env.JWT_DEVICE_ACCESS_EXPIRES_IN : env.JWT_ACCESS_EXPIRES_IN
    ) as jwt.SignOptions["expiresIn"];

    const refreshTokenId = sessionId ?? randomUUID();

    const accessToken = generateToken(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: accessExpiresIn as jwt.SignOptions["expiresIn"],
      jwtid: refreshTokenId,
    });

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

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      user.organizationId,
      user.branchId,
    );

    return user;
  }

  private async _enforceSessionLimit(
    userId: string,
    userType: UserTypeEnums,
  ): Promise<void> {
    const limit = getSessionLimitForUserType(userType);
    const activeSessions = await this.authRepository.listSessions({ userId });

    if (activeSessions.length < limit) return;

    if (isSessionAutoLogoutEnabled(userType)) {
      await this.authRepository.revokeOldestSessions({
        userId,
        count: activeSessions.length - limit + 1,
      });
      return;
    }

    throw new AppError(
      `You've reached the maximum of ${pluralizeByCount(limit, "active session")} for your account. Please sign out from another device before logging in again.`,
      {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.SESSION_LIMIT_REACHED,
      },
    );
  }

  private async _issueUserSessionTokens(
    user: {
      id: string;
      organizationId?: string | null;
      branchId?: string | null;
      userType: UserTypeEnums;
    },
    meta: SessionMeta,
  ) {
    await this._enforceSessionLimit(user.id, user.userType);

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
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        deviceName: meta.deviceName,
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

  private async _completeUserClientLogin(
    user: UserEntity,
    meta: SessionMeta,
  ): Promise<LoginServiceResult> {
    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user, meta);
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

  private async _completePlatformLogin(
    user: UserEntity,
    meta: SessionMeta,
  ): Promise<LoginPlatformUserServiceResult> {
    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user, meta);
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

  private async _completeResellerLogin(
    user: UserEntity,
    meta: SessionMeta,
  ): Promise<LoginResellerServiceResult> {
    const { password, ...userWithoutPassword } = user;
    const tokens = await this._issueUserSessionTokens(user, meta);
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

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async loginUser(
    dto: LoginServiceInput,
  ): Promise<LoginServiceResult | RequiresTwoFactorServiceResult> {
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

    const twoFactorStatus = await this.twoFactorService.getStatus(user.id);
    if (twoFactorStatus.isEnabled) {
      return this.twoFactorService.requestLoginChallenge(
        user.id,
        twoFactorStatus.method,
      );
    }

    return this._completeUserClientLogin(user, dto.meta);
  }

  // Platform user login (SuperAdmin)
  async loginPlatformUser(
    dto: LoginPlatformUserServiceInput,
  ): Promise<LoginPlatformUserServiceResult | RequiresTwoFactorServiceResult> {
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

    const twoFactorStatus = await this.twoFactorService.getStatus(user.id);
    if (twoFactorStatus.isEnabled) {
      return this.twoFactorService.requestLoginChallenge(
        user.id,
        twoFactorStatus.method,
      );
    }

    return this._completePlatformLogin(user, dto.meta);
  }

  // Reseller login
  async loginReseller(
    dto: LoginResellerServiceInput,
  ): Promise<LoginResellerServiceResult | RequiresTwoFactorServiceResult> {
    const user = await this._authenticateUser(dto.email, dto.password, {
      beforePasswordCheck: (user) => {
        if (user.userType !== UserTypeEnums.RESELLER) {
          throw new AppError("Access Denied, You are not a reseller", {
            statusCode: HttpStatusCodes.FORBIDDEN,
          });
        }
      },
    });

    const twoFactorStatus = await this.twoFactorService.getStatus(user.id);
    if (twoFactorStatus.isEnabled) {
      return this.twoFactorService.requestLoginChallenge(
        user.id,
        twoFactorStatus.method,
      );
    }

    return this._completeResellerLogin(user, dto.meta);
  }

  async verifyTwoFactorLogin(
    verificationId: string,
    code: string,
    meta: SessionMeta,
  ): Promise<VerifyTwoFactorLoginServiceResult> {
    const { userId } = await this.twoFactorService.verifyLogin(
      verificationId,
      code,
    );

    const user = await this.userRepository.findOne({ id: userId });
    if (!user || !user.isActive) {
      throw new AppError(
        "Invalid or expired verification session. Please log in again.",
        { statusCode: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      user.organizationId,
      user.branchId,
    );

    if (user.userType === UserTypeEnums.PLATFORM) {
      return this._completePlatformLogin(user, meta);
    }
    if (user.userType === UserTypeEnums.RESELLER) {
      return this._completeResellerLogin(user, meta);
    }
    return this._completeUserClientLogin(user, meta);
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

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      invitation.organizationId,
      invitation.branchId,
    );

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

    const tokens = await this._issueUserSessionTokens(createdUser, dto.meta);

    const { password, ...userWithoutPassword } = createdUser;

    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        createdUser.id,
        createdUser.organizationId,
        createdUser.branchId,
        userScope,
      );
    const settings = await this.userService.getOrCreateSettings(createdUser.id);

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens,
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

    const tokens = await this._issueUserSessionTokens(createdUser, dto.meta);

    const { password, ...userWithoutPassword } = createdUser;

    const { permissions } = await this.userService.getPermissionsAndScopes(
      createdUser.id,
      null,
      null,
    );
    const settings = await this.userService.getOrCreateSettings(createdUser.id);

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      tokens,
      permissions,
      availableScopes: [],
      settings,
    };
  }

  async acceptOrganizationInvitation(
    dto: AcceptOrganizationInvitationServiceInput,
  ): Promise<AcceptOrganizationInvitationServiceResult> {
    const invitation = await this._verifyAndGetPendingInvitation(dto.token);

    if (!invitation.isOrgRegistration || !invitation.organizationName) {
      throw new AppError("This invitation is not an organization invitation.", {
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

    // const existingOrg = await this.organizationRepository.findOne({
    //   name: invitation.organizationName,
    // });
    // if (existingOrg) {
    //   throw new AppError("Organization name already exists", {
    //     statusCode: HttpStatusCodes.CONFLICT,
    //   });
    // }

    const hashedPassword = await hashData(dto.password);

    const allPermissionKeys = Array.from(
      new Set(DEFAULT_ORGANIZATION_ROLES.flatMap((role) => role.permissions)),
    );
    const dbPermissions = await this.rbacRepository.findPermissionsByKeys({
      keys: allPermissionKeys,
    });
    const keyToIdMap = new Map(dbPermissions.map((p) => [p.key, p.id]));

    const { organization, user: createdUser } =
      await this.organizationRepository.createOrganizationWithOwner({
        organizationName: invitation.organizationName,
        registeredName: dto.registeredName,
        registrationNumber: dto.registrationNumber,
        invitationId: invitation.id,
        owner: {
          name: dto.name,
          email: invitation.email,
          hashedPassword,
        },
        defaultRoles: DEFAULT_ORGANIZATION_ROLES,
        keyToIdMap,
      });

    const tokens = await this._issueUserSessionTokens(createdUser, dto.meta);

    const { password, ...userWithoutPassword } = createdUser;

    const userScope = getUserScope(createdUser);
    const { permissions, availableScopes } =
      await this.userService.getPermissionsAndScopes(
        createdUser.id,
        createdUser.organizationId,
        createdUser.branchId,
        userScope,
      );
    const settings = await this.userService.getOrCreateSettings(createdUser.id);

    return {
      clientType: ClientTypeEnum.USER_CLIENT,
      user: userWithoutPassword,
      organization,
      tokens,
      permissions,
      availableScopes,
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

        await isTenantActiveCheck(
          this.organizationRepository,
          this.branchRepository,
          device.organizationId,
          device.branchId,
        );

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
          decoded.jti,
        );

        const rotated = await this.authRepository.rotateRefreshToken({
          sessionId: decoded.jti,
          currentTokenHash: hashSha256(refreshToken),
          newTokenHash: hashSha256(generatedTokens.refreshToken),
          newExpiresAt: this._getRefreshTokenExpiry(
            generatedTokens.refreshToken,
          ),
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
      if (!user || !user.isActive) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      await isTenantActiveCheck(
        this.organizationRepository,
        this.branchRepository,
        user.organizationId,
        user.branchId,
      );

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
        decoded.jti,
      );

      const rotated = await this.authRepository.rotateRefreshToken({
        sessionId: decoded.jti,
        currentTokenHash: hashSha256(refreshToken),
        newTokenHash: hashSha256(generatedTokens.refreshToken),
        newExpiresAt: this._getRefreshTokenExpiry(generatedTokens.refreshToken),
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

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      device.organizationId,
      device.branchId,
    );

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

  // ========================================
  // ? PASSWORD RESET
  // ========================================

  async forgotPassword(
    dto: ForgotPasswordRequestDto,
  ): Promise<ForgotPasswordResponseDto> {
    const genericResponse = {
      message: "A password reset link has been sent.",
    };

    const user = dto.email
      ? await this.userRepository.findOne({ email: dto.email })
      : await this.userRepository.findOne({ mobile: dto.mobile });

    if (!user || !user.isActive) return genericResponse;

    const { verificationId, code } = await this.oneTimeTokenService.issue({
      userId: user.id,
      type: OneTimeTokenTypeEnum.PASSWORD_RESET,
      channel: dto.email
        ? NotificationChannelEnum.EMAIL
        : NotificationChannelEnum.WHATSAPP,
      destination: (dto.email ?? dto.mobile) as string,
    });

    const token = `${verificationId}.${code}`;

    if (dto.email) {
      const baseUrl = env.USER_CLIENT_BASE_URL.replace(/\/$/, "");
      const template = getForgotPasswordTemplate({
        name: user.name,
        resetLink: `${baseUrl}/reset-password?token=${token}`,
      });
      await this.notificationService.send(NotificationChannelEnum.EMAIL, {
        to: dto.email,
        ...template,
      });
    } else {
      await this.notificationService.send(NotificationChannelEnum.WHATSAPP, {
        to: dto.mobile as string,
        template: {
          name: WHATSAPP_TEMPLATES.FORGOT_PASSWORD,
          languageCode: WHATSAPP_TEMPLATE_LANGUAGES.ENGLISH,
          bodyParams: [user.name, env.APP_NAME],
          buttons: [{ index: 0, param: token }],
        },
      });
    }

    return genericResponse;
  }

  async resetPassword(
    dto: ResetPasswordRequestDto,
  ): Promise<ResetPasswordResponseDto> {
    const [verificationId, code] = dto.token.split(".");

    if (!verificationId || !code) {
      throw new AppError("This reset link is invalid or has expired.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const { userId } = await this.oneTimeTokenService.verify({
      verificationId,
      type: OneTimeTokenTypeEnum.PASSWORD_RESET,
      code,
    });

    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("This reset link is invalid or has expired.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const hashedPassword = await hashData(dto.newPassword);
    await this.userRepository.update({
      userId,
      data: { password: hashedPassword },
    });

    await this.authRepository.revokeOtherSessions({ userId });

    return {
      message:
        "Password reset successfully. Please sign in with your new password.",
      userType: user.userType as UserTypeEnums,
    };
  }
}
