import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user-invitation-status.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MailService } from "../../shared/services/mail/mail.service";
import { getInviteUserTemplate } from "../../shared/services/mail/templates/invite-user.template";
import { generateToken } from "../../shared/utils/jwt.helper";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { GetUsersRequestDto } from "./dtos/get-users-request.dto";
import type { GetUsersResponseDto } from "./dtos/get-users-response.dto";
import type { InviteUserRequestDto } from "./dtos/invite-user-request.dto";
import type { InviteUserResponseDto } from "./dtos/invite-user-response.dto";
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

  async getUsersByTenant(
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
      env.JWT_INVITE_SECRET,
      {
        expiresIn: env.JWT_INVITE_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    const expiresAt = dayjs().add(7, "day").toDate();

    await this.userRepository.createInvitation({
      email: dto.email,
      organizationId: userToken.organizationId,
      branchId: userToken.branchId,
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
}
