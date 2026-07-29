import type { OrganizationRepository } from "./organization.repository";
import type {
  CreateOrganizationResponseDto,
  GetOrganizationResponseDto,
  ListOrganizationResponseDto,
  UpdateOrganizationResponseDto,
  DeleteOrganizationResponseDto,
  CreateOrganizationRequestDto,
  GetOrganizationRequestDto,
  ListOrganizationRequestDto,
  UpdateOrganizationRequestDto,
  DeleteOrganizationRequestDto,
} from "./organization.types";
import { AppError } from "../../shared/errors/app-error";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";

export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async create(
    dto: CreateOrganizationRequestDto,
    user?: UserTokenDto,
  ): Promise<CreateOrganizationResponseDto> {
    const existingOrg = await this.organizationRepository.findByName(dto.name);
    if (existingOrg) {
      throw new AppError("Organization name already exists", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const organization = await this.organizationRepository.create({
      name: dto.name,
      createdBy: user?.id,
      updatedBy: user?.id,
    });

    return { organization };
  }

  async getById(
    dto: GetOrganizationRequestDto,
  ): Promise<GetOrganizationResponseDto> {
    const organization = await this.organizationRepository.findById(dto.id);
    if (!organization) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }
    return { organization };
  }

  async list(
    dto: ListOrganizationRequestDto,
  ): Promise<ListOrganizationResponseDto> {
    const filters = {
      orgIds: dto.orgIds,
    };
    const organizations = await this.organizationRepository.findAll(filters);
    return { organizations };
  }

  async update(
    dto: UpdateOrganizationRequestDto,
    user?: UserTokenDto,
  ): Promise<UpdateOrganizationResponseDto> {
    const existingOrg = await this.organizationRepository.findById(dto.id);
    if (!existingOrg) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (dto.name && dto.name !== existingOrg.name) {
      const nameConflict = await this.organizationRepository.findByName(
        dto.name,
      );
      if (nameConflict) {
        throw new AppError("Organization name already exists", {
          statusCode: HttpStatusCodes.CONFLICT,
        });
      }
    }

    const organization = await this.organizationRepository.update(dto.id, {
      ...dto,
      updatedBy: user?.id,
    });

    return { organization: organization! };
  }

  async delete(
    dto: DeleteOrganizationRequestDto,
  ): Promise<DeleteOrganizationResponseDto> {
    const existingOrg = await this.organizationRepository.findById(dto.id);
    if (!existingOrg) {
      throw new AppError("Organization not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const success = await this.organizationRepository.delete(dto.id);
    return { success };
  }
}
