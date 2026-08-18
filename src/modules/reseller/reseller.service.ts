import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MailService } from "../../shared/services/mail/mail.service";
import { getInviteResellerTemplate } from "../../shared/services/mail/templates/invite-reseller.template";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import type { UserRepository } from "../user/user.repository";
import type {
  GetResellerInvitationsServiceInput,
  GetResellerInvitationsServiceResult,
  GetResellersServiceInput,
  GetResellersServiceResult,
  InviteResellerServiceInput,
  InviteResellerServiceResult,
  ToggleResellerStatusServiceInput,
  ToggleResellerStatusServiceResult,
} from "./reseller.types";

export class ResellerService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
  ) {}

  // ========================================
  // ? PLATFORM CLIENT SERVICES
  // ========================================
  async inviteReseller(
    input: InviteResellerServiceInput,
  ): Promise<InviteResellerServiceResult> {
    const { dto, currentUser } = input;

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

    const token = generateToken(
      {
        email: dto.email,
        entityType: UserTypeEnums.RESELLER,
        organizationId: null,
        branchId: null,
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
        entityType: UserTypeEnums.RESELLER,
        organizationId: null,
        branchId: null,
        roleIds: [],
        token,
        expiresAt,
        status: UserInvitationStatusEnum.PENDING,
        createdBy: currentUser.id,
      },
    });

    try {
      const template = getInviteResellerTemplate({
        name: dto.name,
        token,
      });

      await this.mailService.sendMail({
        to: dto.email,
        ...template,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.log(error);
    }

    return {
      message: "Reseller invitation sent successfully",
    };
  }

  async getResellerInvitations(
    input: GetResellerInvitationsServiceInput,
  ): Promise<GetResellerInvitationsServiceResult> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      status,
    } = input.query;

    const { invitations, total } =
      await this.userRepository.findInvitationsByTenant({
        entityType: UserTypeEnums.RESELLER,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        status,
      });

    return {
      invitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getResellers(
    input: GetResellersServiceInput,
  ): Promise<GetResellersServiceResult> {
    const { page = 1, limit = 10, search, sortBy, sortOrder, status } =
      input.query;

    const isActive =
      status === "active" ? true : status === "inactive" ? false : undefined;

    const { resellers, total } = await this.userRepository.findResellers({
      search,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      resellers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleResellerStatus(
    input: ToggleResellerStatusServiceInput,
  ): Promise<ToggleResellerStatusServiceResult> {
    const target = await this.userRepository.findOne({
      id: input.resellerId,
      userType: UserTypeEnums.RESELLER,
    });

    if (!target) {
      throw new AppError("Reseller not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const updated = await this.userRepository.update({
      userId: input.resellerId,
      data: {
        isActive: !target.isActive,
        updatedBy: input.currentUser.id,
      },
    });

    return {
      reseller: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
      },
    };
  }
}
