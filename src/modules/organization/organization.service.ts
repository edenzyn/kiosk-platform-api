import type { OrganizationRepository } from "./organization.repository";
import type { CreateOrganizationRequestDto, CreateOrganizationResponseDto } from "./dtos/create-organization.dtos";
import type { ListOrganizationRequestDto, ListOrganizationResponseDto } from "./dtos/list-organization.dtos";
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
    const existingOrg = await this.organizationRepository.findOne({ name: dto.name });
    if (existingOrg) {
      throw new AppError("Organization name already exists", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const organization = await this.organizationRepository.create({
      data: {
        name: dto.name,
        createdBy: user?.id,
        updatedBy: user?.id,
      },
    });

    return { organization };
  }

  async list(
    dto: ListOrganizationRequestDto,
  ): Promise<ListOrganizationResponseDto> {
    const organizations = await this.organizationRepository.findAll({
      orgIds: dto.orgIds,
    });
    return { organizations };
  }
}
