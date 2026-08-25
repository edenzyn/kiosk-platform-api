import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_LANGUAGES,
} from "../../shared/constants/whatsapp-templates.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { OneTimeTokenTypeEnum } from "../../shared/enums/one-time-token/one-time-token-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { TwoFactorMethodEnums } from "../../shared/enums/user/two-factor-method.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { isTenantActiveCheck } from "../../shared/utils/auth/tenant-active-check.helper";
import {
  compareHashedData,
  hashData,
} from "../../shared/utils/core/bcrypt.helper";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import { getUserScope } from "../../shared/utils/user/user-scope.helper";
import type { AuthRepository } from "../auth/auth.repository";
import type { SessionDto } from "../auth/auth.types";
import type {
  DisableTwoFactorResponseDto,
  EnableTwoFactorResponseDto,
  SetupTwoFactorResponseDto,
  TwoFactorStatusResponseDto,
} from "../auth/dtos/two-factor.dtos";
import type { OneTimeTokenService } from "../auth/services/one-time-token.service";
import type { TwoFactorService } from "../auth/services/two-factor.service";
import type { BranchRepository } from "../branch/branch.repository";
import { getInviteUserTemplate } from "../notification/channels/email/templates/invite-user.template";
import { getTwoFactorOtpTemplate } from "../notification/channels/email/templates/two-factor-otp.template";
import type { NotificationService } from "../notification/notification.service";
import type { OrganizationRepository } from "../organization/organization.repository";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { RbacService } from "../rbac/rbac.service";
import type {
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
} from "./dtos/change-password.dtos";
import type { CheckAuthResponseDto, UserScope } from "./dtos/check-auth.dtos";
import type {
  GetUsersRequestDto,
  GetUsersResponseDto,
} from "./dtos/get-users.dtos";
import type {
  InviteUserRequestDto,
  InviteUserResponseDto,
} from "./dtos/invite-user.dtos";
import type { RevokeInvitationResponseDto } from "./dtos/revoke-invitation.dtos";
import type {
  ConfirmContactChangeResponseDto,
  RequestContactChangeResponseDto,
  RequestEmailChangeRequestDto,
  RequestMobileChangeRequestDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
} from "./dtos/update-profile.dtos";
import type {
  UpdateUserSettingsRequestDto,
  UpdateUserSettingsResponseDto,
} from "./dtos/user-settings.dtos";
import type { UserSettingsEntity } from "./schemas/user-settings.schema";
import type { UserRepository } from "./user.repository";
import type {
  GetInvitationsByTenantServiceInput,
  GetInvitationsByTenantServiceResult,
} from "./user.types";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly notificationService: NotificationService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly branchRepository: BranchRepository,
    private readonly rbacService: RbacService,
    private readonly twoFactorService: TwoFactorService,
    private readonly authRepository: AuthRepository,
    private readonly oneTimeTokenService: OneTimeTokenService,
  ) {}

  async getPermissionsAndScopes(
    userId: string,
    organizationId: string | null,
    branchId: string | null,
    userScope?: UserScopeTypeEnums,
  ): Promise<{
    permissions: UserPermissions[];
    availableScopes: UserScope[];
  }> {
    const permissionKeys = await this.rbacRepository.findUserPermissionKeys({
      userId,
      organizationId,
      branchId,
    });

    const availableScopes: UserScope[] = [];

    if (!organizationId) {
      return {
        permissions: Array.from(permissionKeys) as UserPermissions[],
        availableScopes,
      };
    }

    const organization = await this.organizationRepository.findOne({
      id: organizationId,
    });

    if (!organization) {
      return {
        permissions: Array.from(permissionKeys) as UserPermissions[],
        availableScopes,
      };
    }

    // ======================================================
    // Organization User
    // ======================================================
    if (userScope === UserScopeTypeEnums.ORGANIZATION) {
      availableScopes.push({
        id: organization.id,
        name: organization.name,
        type: UserScopeTypeEnums.ORGANIZATION,
        createdAt: null,
      });

      const { branches } = await this.branchRepository.find({
        organizationId,
      });

      for (const branch of branches) {
        availableScopes.push({
          id: branch.id,
          name: branch.name as string,
          type: UserScopeTypeEnums.BRANCH,
          createdAt: branch.createdAt,
        });
      }
    }

    // ======================================================
    // Branch User
    // ======================================================
    else {
      if (branchId) {
        const { branches } = await this.branchRepository.find({
          branchIds: [branchId],
        });

        const branch = branches[0];

        if (branch) {
          availableScopes.push({
            id: branch.id,
            name: branch.name as string,
            type: UserScopeTypeEnums.BRANCH,
            createdAt: branch.createdAt,
          });
        }
      }
    }

    return {
      permissions: Array.from(permissionKeys) as UserPermissions[],
      availableScopes,
    };
  }

  async checkAuth(tokenUser: UserTokenDto): Promise<CheckAuthResponseDto> {
    const user = await this.userRepository.findOne({ id: tokenUser.id });

    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      user.organizationId,
      user.branchId,
    );

    const { password, ...userWithoutPassword } = user;

    const userScope = getUserScope(user);
    const settings = await this.getOrCreateSettings(user.id);

    const { permissions, availableScopes } = await this.getPermissionsAndScopes(
      user.id,
      user.organizationId,
      user.branchId,
      userScope,
    );

    // Resellers have no org/branch scopes and never hold roles - skip both
    if (user.userType === UserTypeEnums.RESELLER) {
      return {
        user: userWithoutPassword,
        permissions,
        settings,
      };
    }

    const topRole = await this.rbacRepository.findOneTopRankedRole({
      userId: user.id,
    });
    const topRoleDto = topRole
      ? {
          name: topRole.name,
          description: topRole.description,
          rank: topRole.rank,
          isSystem: topRole.isSystem,
        }
      : null;

    return {
      user: userWithoutPassword,
      permissions,
      availableScopes,
      topRole: topRoleDto,
      settings,
    };
  }

  async updateMySettings(
    userId: string,
    dto: UpdateUserSettingsRequestDto,
  ): Promise<UpdateUserSettingsResponseDto> {
    return this.userRepository.updateSettings({
      userId,
      data: dto,
    });
  }

  async getOrCreateSettings(userId: string): Promise<UserSettingsEntity> {
    return this.userRepository.getOrCreateSettings(userId);
  }

  async listMySessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<{ sessions: SessionDto[] }> {
    const sessions = await this.authRepository.listSessions({ userId });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        isCurrent: session.id === currentSessionId,
      })),
    };
  }

  async revokeMySession(userId: string, sessionId: string): Promise<boolean> {
    return this.authRepository.revokeSession({ userId, sessionId });
  }

  async revokeMyOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    return this.authRepository.revokeOtherSessions({
      userId,
      keepSessionId: currentSessionId,
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponseDto> {
    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const isMatch = await compareHashedData(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const hashedPassword = await hashData(dto.newPassword);
    await this.userRepository.update({
      userId,
      data: { password: hashedPassword },
    });

    return { message: "Password changed successfully" };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileRequestDto,
  ): Promise<UpdateProfileResponseDto> {
    const updated = await this.userRepository.update({
      userId,
      data: { name: dto.name },
    });
    const { password, ...safeUser } = updated;
    return safeUser;
  }

  /** Re-authenticates the caller before a sensitive profile change. */
  private async _assertPassword(
    hashedPassword: string,
    suppliedPassword: string,
  ): Promise<void> {
    const isMatch = await compareHashedData(suppliedPassword, hashedPassword);
    if (!isMatch) {
      throw new AppError("Incorrect password", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }
  }

  async requestEmailChange(
    userId: string,
    dto: RequestEmailChangeRequestDto,
  ): Promise<RequestContactChangeResponseDto> {
    const newEmail = dto.newEmail;

    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    await this._assertPassword(user.password, dto.password);

    if (newEmail === user.email) {
      throw new AppError(
        "New email address cannot be same as current email address",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        },
      );
    }

    const existing = await this.userRepository.findOne({ email: newEmail });
    if (existing) {
      throw new AppError("Email is already in use", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    const { verificationId, code } = await this.oneTimeTokenService.issue({
      userId,
      type: OneTimeTokenTypeEnum.EMAIL_CHANGE,
      channel: NotificationChannelEnum.EMAIL,
      destination: newEmail,
    });

    const template = getTwoFactorOtpTemplate({ code });
    await this.notificationService.send(NotificationChannelEnum.EMAIL, {
      to: newEmail,
      ...template,
    });

    return { verificationId };
  }

  async confirmEmailChange(
    userId: string,
    verificationId: string,
    code: string,
  ): Promise<ConfirmContactChangeResponseDto> {
    const { destination } = await this.oneTimeTokenService.verify({
      verificationId,
      userId,
      type: OneTimeTokenTypeEnum.EMAIL_CHANGE,
      code,
    });

    const updated = await this.userRepository.update({
      userId,
      data: { email: destination },
    });
    const { password, ...safeUser } = updated;
    return { message: "Email updated successfully", user: safeUser };
  }

  async requestMobileChange(
    userId: string,
    dto: RequestMobileChangeRequestDto,
  ): Promise<RequestContactChangeResponseDto> {
    const newMobile = dto.newMobile;

    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    await this._assertPassword(user.password, dto.password);

    if (newMobile === user.mobile) {
      throw new AppError(
        "New mobile number cannot be same as current mobile number",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        },
      );
    }

    const existing = await this.userRepository.findOne({ mobile: newMobile });
    if (existing) {
      throw new AppError("Mobile number is already in use", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    const { verificationId, code } = await this.oneTimeTokenService.issue({
      userId,
      type: OneTimeTokenTypeEnum.MOBILE_CHANGE,
      channel: NotificationChannelEnum.WHATSAPP,
      destination: newMobile,
    });

    await this.notificationService.send(NotificationChannelEnum.WHATSAPP, {
      to: newMobile,
      template: {
        name: WHATSAPP_TEMPLATES.OTP,
        languageCode: WHATSAPP_TEMPLATE_LANGUAGES.ENGLISH_US,
        bodyParams: [code, "verify mobile"],
        buttons: [{ index: 0, param: code }],
      },
    });

    return { verificationId };
  }

  async confirmMobileChange(
    userId: string,
    verificationId: string,
    code: string,
  ): Promise<ConfirmContactChangeResponseDto> {
    const { destination } = await this.oneTimeTokenService.verify({
      verificationId,
      userId,
      type: OneTimeTokenTypeEnum.MOBILE_CHANGE,
      code,
    });

    const updated = await this.userRepository.update({
      userId,
      data: { mobile: destination },
    });
    const { password, ...safeUser } = updated;
    return { message: "Mobile number updated successfully", user: safeUser };
  }

  async getTwoFactorStatus(
    userId: string,
  ): Promise<TwoFactorStatusResponseDto> {
    return this.twoFactorService.getStatus(userId);
  }

  async setupTwoFactor(
    userId: string,
    method: TwoFactorMethodEnums,
  ): Promise<SetupTwoFactorResponseDto> {
    return this.twoFactorService.setup(userId, method);
  }

  async enableTwoFactor(
    userId: string,
    verificationId: string,
    code: string,
  ): Promise<EnableTwoFactorResponseDto> {
    return this.twoFactorService.enable(userId, verificationId, code);
  }

  async disableTwoFactor(
    userId: string,
    password: string,
  ): Promise<DisableTwoFactorResponseDto> {
    return this.twoFactorService.disable(userId, password);
  }

  async getUsersByTenantAndScope(
    queryDto: GetUsersRequestDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<GetUsersResponseDto> {
    const page = queryDto.page;
    const limit = queryDto.limit;
    const { users, total } = await this.userRepository.findByTenant({
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId || undefined,
      search: queryDto.search,
      page,
      limit,
      sortBy: queryDto.sortBy,
      sortOrder: queryDto.sortOrder,
    });

    const usersWithTopRole = await Promise.all(
      users.map(async (user) => {
        const topRole = await this.rbacRepository.findOneTopRankedRole({
          userId: user.id,
        });
        const topRoleDto = topRole
          ? {
              id: topRole.id,
              name: topRole.name ?? "",
              description: topRole.description,
              rank: topRole.rank,
              isSystem: topRole.isSystem,
            }
          : null;
        return {
          ...user,
          topRole: topRoleDto,
        };
      }),
    );

    return {
      users: usersWithTopRole,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async inviteUser(
    dto: InviteUserRequestDto,
    userToken: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<InviteUserResponseDto> {
    const existingUser = await this.userRepository.findOne({
      email: dto.email,
    });
    if (existingUser) {
      throw new AppError("User already exists with this email address", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    const existingPendingInvitation =
      await this.userRepository.findOneInvitation({
        email: dto.email,
        status: UserInvitationStatusEnum.PENDING,
      });
    if (existingPendingInvitation) {
      throw new AppError(
        "A pending invitation already exists for this email address",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
        },
      );
    }

    const branchId = dto.branchId || effectiveTenant.branchId;

    if (dto.roles && dto.roles.length > 0) {
      await this.rbacService.validateUserCanAssignRoles(userToken, dto.roles);
    }

    const token = generateToken(
      {
        email: dto.email,
        organizationId: effectiveTenant.organizationId,
        branchId: branchId || null,
      },
      env.JWT_INVITE_USER_SECRET,
      {
        expiresIn:
          env.JWT_INVITE_USER_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    const expiresAt = dayjs().add(7, "day").toDate();

    await this.userRepository.createInvitation({
      invitation: {
        email: dto.email,
        name: dto.name,
        organizationId: effectiveTenant.organizationId,
        branchId: branchId || null,
        roleIds: dto.roles || [],
        token,
        expiresAt,
        status: UserInvitationStatusEnum.PENDING,
        createdBy: userToken.id,
      },
    });

    try {
      const template = getInviteUserTemplate({
        name: dto.name,
        token,
      });

      await this.notificationService.send(NotificationChannelEnum.EMAIL, {
        to: dto.email,
        ...template,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.log(error);
    }

    return {
      message: "User invitation sent successfully",
    };
  }

  async getInvitationsByTenant(
    input: GetInvitationsByTenantServiceInput,
  ): Promise<GetInvitationsByTenantServiceResult> {
    const { effectiveTenant, query } = input;
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      status,
      expiresStart,
      expiresEnd,
    } = query;

    const { invitations, total } =
      await this.userRepository.findInvitationsByTenant({
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId || undefined,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        status,
        expiresStart,
        expiresEnd,
      });
    return {
      invitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async revokeInvitation(
    id: string,
    userToken: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<RevokeInvitationResponseDto> {
    const invitation = await this.userRepository.findOneInvitation({ id });
    if (!invitation) {
      throw new AppError("Invitation not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const isOrgMatch =
      !effectiveTenant.organizationId ||
      invitation.organizationId === effectiveTenant.organizationId;

    if (!isOrgMatch) {
      throw new AppError("Forbidden to access this invitation", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.PENDING) {
      throw new AppError("Only pending invitations can be revoked", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    await this.userRepository.updateInvitation({
      id,
      data: {
        status: UserInvitationStatusEnum.REVOKED,
        updatedBy: userToken.id,
      },
    });

    return {
      message: "Invitation revoked successfully",
      success: true,
    };
  }

  async resendInvitation(
    id: string,
    userToken: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<{ message: string; success: boolean }> {
    const invitation = await this.userRepository.findOneInvitation({ id });
    if (!invitation) {
      throw new AppError("Invitation not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const isOrgMatch =
      !effectiveTenant.organizationId ||
      invitation.organizationId === effectiveTenant.organizationId;

    if (!isOrgMatch) {
      throw new AppError("Forbidden to access this invitation", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.EXPIRED) {
      throw new AppError("Only pending or expired invitations can be resent", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const token = generateToken(
      {
        email: invitation.email,
        organizationId: invitation.organizationId,
        branchId: invitation.branchId || null,
      },
      env.JWT_INVITE_USER_SECRET,
      {
        expiresIn:
          env.JWT_INVITE_USER_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    const expiresAt = dayjs().add(7, "day").toDate();

    await this.userRepository.updateInvitation({
      id,
      data: {
        token,
        expiresAt,
        status: UserInvitationStatusEnum.PENDING,
        updatedBy: userToken.id,
      },
    });

    try {
      const template = getInviteUserTemplate({
        name: invitation.name || "User",
        token,
      });

      await this.notificationService.send(NotificationChannelEnum.EMAIL, {
        to: invitation.email,
        ...template,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.log(error);
    }

    return {
      message: "Invitation resent successfully",
      success: true,
    };
  }
}
