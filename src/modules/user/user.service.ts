import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MailService } from "../../shared/services/mail/mail.service";
import { getInviteUserTemplate } from "../../shared/services/mail/templates/invite-user.template";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import { getUserScope } from "../../shared/utils/user/user-scope.helper";
import type { BranchRepository } from "../branch/branch.repository";
import type { OrganizationRepository } from "../organization/organization.repository";
import type { RbacRepository } from "../rbac/rbac.repository";
import {
  type CheckAuthResponseDto,
  type UserScope,
} from "./dtos/check-auth-response.dto";
import type { GetInvitationsResponseDto } from "./dtos/get-invitations-response.dto";
import type { GetUsersRequestDto } from "./dtos/get-users-request.dto";
import type { GetUsersResponseDto } from "./dtos/get-users-response.dto";
import type { InviteUserRequestDto } from "./dtos/invite-user-request.dto";
import type { InviteUserResponseDto } from "./dtos/invite-user-response.dto";
import type { RevokeInvitationResponseDto } from "./dtos/revoke-invitation-response.dto";
import type { UserRepository } from "./user.repository";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly mailService: MailService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly branchRepository: BranchRepository,
  ) {}

  async getPermissionsAndScopes(
    userId: string,
    organizationId: string | null,
    branchId: string | null,
    userScope: UserScopeTypeEnums,
  ): Promise<{
    permissions: UserPermissions[];
    availableScopes: UserScope[];
  }> {
    const permissionKeys = await this.rbacRepository.getUserPermissionKeys({
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

    const organization =
      await this.organizationRepository.findById(organizationId);

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

      const { branches } =
        await this.branchRepository.getBranches(organizationId);

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
        const { branches } = await this.branchRepository.getBranches(
          undefined,
          [branchId],
        );

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
    const user = await this.userRepository.findById(tokenUser.id);

    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const { password, ...userWithoutPassword } = user;

    const userScope = getUserScope(user);

    const { permissions, availableScopes } = await this.getPermissionsAndScopes(
      user.id,
      user.organizationId,
      user.branchId,
      userScope,
    );

    return {
      user: userWithoutPassword,
      permissions,
      availableScopes,
    };
  }

  async getUsersByTenantAndScope(
    queryDto: GetUsersRequestDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<GetUsersResponseDto> {
    const page = queryDto.page;
    const limit = queryDto.limit;
    const { users, total } = await this.userRepository.findByTenant(
      effectiveTenant.organizationId,
      effectiveTenant.branchId || undefined,
      queryDto.search,
      page,
      limit,
    );

    return {
      users,
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
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError("User already exists with this email address", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    const token = generateToken(
      {
        email: dto.email,
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
      },
      env.JWT_INVITE_USER_SECRET,
      {
        expiresIn:
          env.JWT_INVITE_USER_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    const expiresAt = dayjs().add(7, "day").toDate();

    await this.userRepository.createInvitation({
      email: dto.email,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId,
      roleIds: dto.roles || [],
      token,
      expiresAt,
      status: UserInvitationStatusEnum.PENDING,
      createdBy: userToken.id,
    });

    try {
      const template = getInviteUserTemplate({
        name: dto.name,
        token,
      });

      await this.mailService.sendMail({
        to: dto.email,
        ...template,
      });
    } catch (error) {
      console.log(error);
    }

    return {
      message: "User invitation sent successfully",
    };
  }

  async getInvitationsByTenant(
    effectiveTenant: EffectiveTenant,
    page: number = 1,
    limit: number = 10,
  ): Promise<GetInvitationsResponseDto> {
    const { invitations, total } =
      await this.userRepository.findInvitationsByTenant(
        effectiveTenant.organizationId,
        effectiveTenant.branchId || undefined,
        page,
        limit,
      );
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
    const invitation = await this.userRepository.findInvitationById(id);
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

    await this.userRepository.updateInvitationStatus(
      id,
      UserInvitationStatusEnum.REVOKED,
      userToken.id,
    );

    return {
      message: "Invitation revoked successfully",
      success: true,
    };
  }
}
