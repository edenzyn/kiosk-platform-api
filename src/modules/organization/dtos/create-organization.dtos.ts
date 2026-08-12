import type { OrganizationEntity } from "../organization.schema";

export interface CreateOrganizationRequestDto {
  name: string;
}

export interface CreateOrganizationResponseDto {
  organization: OrganizationEntity;
}
