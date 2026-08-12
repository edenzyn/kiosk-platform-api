import type { OrganizationEntity } from "../organization.schema";

export interface ListOrganizationRequestDto {
  orgIds?: string[];
}

export interface ListOrganizationResponseDto {
  organizations: OrganizationEntity[];
}
