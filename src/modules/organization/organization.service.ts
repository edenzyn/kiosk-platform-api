import type jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { FILE_UPLOAD_CONFIG } from "../../shared/constants/file-upload.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { BadRequestError } from "../../shared/errors/bad-request-error";
import { ConflictError } from "../../shared/errors/conflict-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { getInviteOrganizationTemplate } from "../../shared/utils/emailTemplates/invite-organization.template";
import { resolveExpiryDate } from "../../shared/utils/core/date.helper";
import { generateToken } from "../../shared/utils/core/jwt.helper";
import type { FileService } from "../file/file.service";
import type { NotificationService } from "../notification/notification.service";
import type { UserRepository } from "../user/user.repository";
import type { OrganizationRepository } from "./organization.repository";
import type {
  FinalizeOrganizationLogoServiceInput,
  FinalizeOrganizationLogoServiceResult,
  GetMyOrganizationSettingsServiceResult,
  GetOrganizationInvitationsServiceInput,
  GetOrganizationInvitationsServiceResult,
  GetOrganizationsServiceInput,
  GetOrganizationsServiceResult,
  InviteOrganizationServiceInput,
  InviteOrganizationServiceResult,
  RequestOrganizationLogoUploadServiceInput,
  RequestOrganizationLogoUploadServiceResult,
  ResendOrganizationInvitationServiceInput,
  ResendOrganizationInvitationServiceResult,
  RevokeOrganizationInvitationServiceInput,
  RevokeOrganizationInvitationServiceResult,
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
    private readonly fileService: FileService,
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
      throw new ConflictError("User already exists with this email address");
    }

    const existingPendingInvitation =
      await this.userRepository.findOneInvitation({
        email: dto.email,
        status: UserInvitationStatusEnum.PENDING,
      });
    if (existingPendingInvitation) {
      throw new ConflictError(
        "A pending invitation already exists for this email address",
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
    const expiresAt = resolveExpiryDate(env.JWT_INVITE_USER_EXPIRES_IN);

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
        marketIds: dto.marketIds,
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

  async getOrganizationInvitations(
    input: GetOrganizationInvitationsServiceInput,
  ): Promise<GetOrganizationInvitationsServiceResult> {
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
        entityType: UserTypeEnums.NORMAL,
        isOrgRegistration: true,
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

  async revokeOrganizationInvitation(
    input: RevokeOrganizationInvitationServiceInput,
  ): Promise<RevokeOrganizationInvitationServiceResult> {
    const invitation = await this.userRepository.findOneInvitation({
      id: input.invitationId,
    });

    if (!invitation || !invitation.isOrgRegistration) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.status !== UserInvitationStatusEnum.PENDING) {
      throw new BadRequestError("Only pending invitations can be revoked");
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

  async resendOrganizationInvitation(
    input: ResendOrganizationInvitationServiceInput,
  ): Promise<ResendOrganizationInvitationServiceResult> {
    const invitation = await this.userRepository.findOneInvitation({
      id: input.invitationId,
    });

    if (!invitation || !invitation.isOrgRegistration) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.status !== UserInvitationStatusEnum.EXPIRED) {
      throw new BadRequestError("Only expired invitations can be resent");
    }

    const token = generateToken(
      {
        email: invitation.email,
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
      const template = getInviteOrganizationTemplate({
        name: invitation.name || "there",
        organizationName: invitation.organizationName || "your organization",
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

  async toggleOrganizationStatus(
    input: ToggleOrganizationStatusServiceInput,
  ): Promise<ToggleOrganizationStatusServiceResult> {
    const target = await this.organizationRepository.findOne({
      id: input.organizationId,
    });

    if (!target) {
      throw new NotFoundError("Organization not found");
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
  async updateMyOrganization(
    input: UpdateMyOrganizationServiceInput,
  ): Promise<UpdateMyOrganizationServiceResult> {
    const existing = await this.organizationRepository.findOne({
      id: input.organizationId,
    });

    if (!existing) {
      throw new NotFoundError("Organization not found");
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
    const organization = await this.organizationRepository.findOne({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const settings =
      await this.organizationRepository.getOrCreateSettings(organizationId);

    let brandLogoUrl: string | null = null;
    if (settings.logo) {
      const result = await this.fileService.generateBrandLogoUrl(settings.logo);
      brandLogoUrl = result.brandLogoUrl;
    }

    return { organization, settings, brandLogoUrl };
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

  async requestBrandLogoUpload(
    input: RequestOrganizationLogoUploadServiceInput,
  ): Promise<RequestOrganizationLogoUploadServiceResult> {
    const { contentType, fileSize } = input;

    if (
      !FILE_UPLOAD_CONFIG.BRAND_LOGO.acceptedTypes.includes(
        contentType as (typeof FILE_UPLOAD_CONFIG.BRAND_LOGO.acceptedTypes)[number],
      )
    ) {
      throw new BadRequestError("Unsupported or missing image content type", {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (
      fileSize <= 0 ||
      fileSize > FILE_UPLOAD_CONFIG.BRAND_LOGO.maxSizeBytes
    ) {
      throw new BadRequestError("Image is too large", {
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const { logo, uploadUrl, expiresIn } =
      await this.fileService.createBrandLogoUploadUrl({ contentType });

    return { logo, uploadUrl, expiresIn };
  }

  async finalizeBrandLogoUpload(
    input: FinalizeOrganizationLogoServiceInput,
  ): Promise<FinalizeOrganizationLogoServiceResult> {
    const { organizationId, logo } = input;

    await this.fileService.finalizeBrandLogo({
      logo,
      maxSizeBytes: FILE_UPLOAD_CONFIG.BRAND_LOGO.maxSizeBytes,
    });

    await this.updateMyOrganizationSettings({
      organizationId,
      data: { logo },
    });

    const { brandLogoUrl, expiresIn } =
      await this.fileService.generateBrandLogoUrl(logo);

    return { brandLogoUrl, expiresIn };
  }

  async deleteBrandLogo(organizationId: string): Promise<void> {
    const { settings } = await this.getMyOrganizationSettings(organizationId);

    if (!settings.logo) return;

    await this.updateMyOrganizationSettings({
      organizationId,
      data: { logo: null },
    });
  }
}
