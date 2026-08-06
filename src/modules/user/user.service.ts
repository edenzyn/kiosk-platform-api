import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MailService } from "../../shared/services/mail/mail.service";
import { getInviteUserTemplate } from "../../shared/services/mail/templates/invite-user.template";
import { generateToken } from "../../shared/utils/jwt.helper";
import type { RbacRepository } from "../rbac/rbac.repository";
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
  ) {}

  async checkAuth(tokenUser: UserTokenDto) {
    const user = await this.userRepository.findById(tokenUser.id);
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
    const { password, ...userWithoutPassword } = user;

    const permissionKeys = await this.rbacRepository.getUserPermissionKeys({
      userId: tokenUser.id,
      organizationId: tokenUser.organizationId,
      branchId: tokenUser.branchId,
    });

    return {
      user: userWithoutPassword,
      permissions: [...permissionKeys],
    };
  }

  async getUsersByTenantAndScope(
    queryDto: GetUsersRequestDto,
    userToken: UserTokenDto,
  ): Promise<GetUsersResponseDto> {
    const users = await this.userRepository.findByTenant(
      userToken.organizationId,
      userToken.branchId,
      queryDto.search,
    );

    return { users };
  }

  async inviteUser(
    dto: InviteUserRequestDto,
    userToken: UserTokenDto,
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
        organizationId: userToken.organizationId,
        branchId: userToken.branchId,
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
      organizationId: userToken.organizationId ?? null,
      branchId: userToken.branchId ?? null,
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
    userToken: UserTokenDto,
  ): Promise<GetInvitationsResponseDto> {
    const invitations = await this.userRepository.findInvitationsByTenant(
      userToken.organizationId,
      userToken.branchId,
    );
    return { invitations };
  }

  async revokeInvitation(
    id: string,
    userToken: UserTokenDto,
  ): Promise<RevokeInvitationResponseDto> {
    const invitation = await this.userRepository.findInvitationById(id);
    if (!invitation) {
      throw new AppError("Invitation not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const isOrgMatch =
      !userToken.organizationId ||
      invitation.organizationId === userToken.organizationId;
    const isBranchMatch =
      !userToken.branchId || invitation.branchId === userToken.branchId;

    if (!isOrgMatch || !isBranchMatch) {
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
