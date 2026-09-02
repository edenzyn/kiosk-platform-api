import dayjs from "dayjs";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { getInviteOrganizationTemplate } from "../../shared/utils/emailTemplates/invite-organization.template";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import type { NotificationService } from "../notification/notification.service";
import type { UserRepository } from "../user/user.repository";
import type { OrganizationRepository } from "./organization.repository";
import type {
  GetMyOrganizationServiceResult,
  GetMyOrganizationSettingsServiceResult,
  GetOrganizationsServiceInput,
  GetOrganizationsServiceResult,
  InviteOrganizationServiceInput,
  InviteOrganizationServiceResult,
  ToggleOrganizationStatusServiceInput,
  ToggleOrganizationStatusServiceResult,
  UpdateMyOrganizationServiceInput,
  UpdateMyOrganizationServiceResult,
  UpdateMyOrganizationSettingsServiceInput,
  UpdateMyOrganizationSettingsServiceResult,
} from "./organization.types";

export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // ========================================
  // ? PLATFORM CLIENT SERVICES
  // ========================================
  async inviteOrganization(
    input: InviteOrganizationServiceInput,
  ): Promise<InviteOrganizationServiceResult> {
    const { dto, currentUser } = input;

    // const existingOrg = await this.organizationRepository.findOne({
    //   name: dto.organizationName,
    // });
    // if (existingOrg) {
    //   throw new AppError("Organization name already exists", {
    //     statusCode: HttpStatusCodes.CONFLICT,
    //     code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
    //   });
    // }

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
        entityType: UserTypeEnums.NORMAL,
        isOrgRegistration: true,
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
        entityType: UserTypeEnums.NORMAL,
        isOrgRegistration: true,
        organizationName: dto.organizationName,
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
      const template = getInviteOrganizationTemplate({
        name: dto.name,
        organizationName: dto.organizationName,
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
      message: "Organization invitation sent successfully",
    };
  }

  async getOrganizations(
    input: GetOrganizationsServiceInput,
  ): Promise<GetOrganizationsServiceResult> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      status,
    } = input.query;

    const isActive =
      status === "active" ? true : status === "inactive" ? false : undefined;

    const { organizations, total } =
      await this.organizationRepository.findPaginated({
        search,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      });

    return {
      organizations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleOrganizationStatus(
    input: ToggleOrganizationStatusServiceInput,
  ): Promise<ToggleOrganizationStatusServiceResult> {
    const target = await this.organizationRepository.findOne({
      id: input.organizationId,
    });

    if (!target) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const updated = await this.organizationRepository.update({
      id: input.organizationId,
      data: {
        isActive: !target.isActive,
        updatedBy: input.currentUser.id,
      },
    });

    return { organization: updated };
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async getMyOrganization(
    organizationId: string,
  ): Promise<GetMyOrganizationServiceResult> {
    const organization = await this.organizationRepository.findOne({
      id: organizationId,
    });

    if (!organization) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return { organization };
  }

  async updateMyOrganization(
    input: UpdateMyOrganizationServiceInput,
  ): Promise<UpdateMyOrganizationServiceResult> {
    const existing = await this.organizationRepository.findOne({
      id: input.organizationId,
    });

    if (!existing) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const organization = await this.organizationRepository.update({
      id: input.organizationId,
      data: { ...input.data, updatedBy: input.currentUser.id },
    });

    return { organization };
  }

  async getMyOrganizationSettings(
    organizationId: string,
  ): Promise<GetMyOrganizationSettingsServiceResult> {
    const settings =
      await this.organizationRepository.getOrCreateSettings(organizationId);

    return { settings };
  }

  async updateMyOrganizationSettings(
    input: UpdateMyOrganizationSettingsServiceInput,
  ): Promise<UpdateMyOrganizationSettingsServiceResult> {
    const settings = await this.organizationRepository.updateSettings({
      organizationId: input.organizationId,
      data: input.data,
    });

    return { settings };
  }
}
