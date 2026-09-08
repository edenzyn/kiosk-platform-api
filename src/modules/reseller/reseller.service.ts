import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { getInviteResellerTemplate } from "../../shared/utils/emailTemplates/invite-reseller.template";
import { resolveExpiryDate } from "../../shared/utils/core/date.helper";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import type { MarketService } from "../market/market.service";
import type { NotificationService } from "../notification/notification.service";
import type { UserRepository } from "../user/user.repository";
import type {
  GetResellerInvitationsServiceInput,
  GetResellerInvitationsServiceResult,
  GetResellersServiceInput,
  GetResellersServiceResult,
  InviteResellerServiceInput,
  InviteResellerServiceResult,
  ResendResellerInvitationServiceInput,
  ResendResellerInvitationServiceResult,
  RevokeResellerInvitationServiceInput,
  RevokeResellerInvitationServiceResult,
  ToggleResellerStatusServiceInput,
  ToggleResellerStatusServiceResult,
} from "./reseller.types";

export class ResellerService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly marketService: MarketService,
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

    await this.marketService.validateMarketIds({ marketIds: dto.marketIds });

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
    const expiresAt = resolveExpiryDate(env.JWT_INVITE_USER_EXPIRES_IN);

    await this.userRepository.createInvitation({
      invitation: {
        email: dto.email,
        name: dto.name,
        entityType: UserTypeEnums.RESELLER,
        organizationId: null,
        branchId: null,
        roleIds: [],
        marketIds: dto.marketIds,
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

      await this.notificationService.send(NotificationChannelEnum.EMAIL, {
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

  async revokeResellerInvitation(
    input: RevokeResellerInvitationServiceInput,
  ): Promise<RevokeResellerInvitationServiceResult> {
    const invitation = await this.userRepository.findOneInvitation({
      id: input.invitationId,
    });

    if (!invitation || invitation.entityType !== UserTypeEnums.RESELLER) {
      throw new AppError("Invitation not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.PENDING) {
      throw new AppError("Only pending invitations can be revoked", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    await this.userRepository.updateInvitation({
      id: input.invitationId,
      data: {
        status: UserInvitationStatusEnum.REVOKED,
        updatedBy: input.currentUser.id,
      },
    });

    return {
      message: "Invitation revoked successfully",
      success: true,
    };
  }

  async resendResellerInvitation(
    input: ResendResellerInvitationServiceInput,
  ): Promise<ResendResellerInvitationServiceResult> {
    const invitation = await this.userRepository.findOneInvitation({
      id: input.invitationId,
    });

    if (!invitation || invitation.entityType !== UserTypeEnums.RESELLER) {
      throw new AppError("Invitation not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (invitation.status !== UserInvitationStatusEnum.EXPIRED) {
      throw new AppError("Only expired invitations can be resent", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const token = generateToken(
      {
        email: invitation.email,
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
    const expiresAt = resolveExpiryDate(env.JWT_INVITE_USER_EXPIRES_IN);

    await this.userRepository.updateInvitation({
      id: input.invitationId,
      data: {
        token,
        expiresAt,
        status: UserInvitationStatusEnum.PENDING,
        updatedBy: input.currentUser.id,
      },
    });

    try {
      const template = getInviteResellerTemplate({
        name: invitation.name || "Reseller",
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
