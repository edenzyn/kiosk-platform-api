import type { OrganizationRepository } from "./organization.repository";
import type { CreateOrganizationRequestDto } from "./dtos/create-organization-request.dto";
import type { CreateOrganizationResponseDto } from "./dtos/create-organization-response.dto";
import type { ListOrganizationRequestDto } from "./dtos/list-organization-request.dto";
import type { ListOrganizationResponseDto } from "./dtos/list-organization-response.dto";
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

  async list(
    dto: ListOrganizationRequestDto,
  ): Promise<ListOrganizationResponseDto> {
    const filters = {
      orgIds: dto.orgIds,
    };
    const organizations = await this.organizationRepository.findAll(filters);
    return { organizations };
  }
}
