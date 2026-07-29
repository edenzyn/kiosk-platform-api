import type { OrganizationEntity } from "./organization.schema";

// --- Create ---
export interface CreateOrganizationRequestDto {
  name: string;
}

export interface CreateOrganizationResponseDto {
  organization: OrganizationEntity;
}

// --- List ---
export interface ListOrganizationRequestDto {
  orgIds?: string[];
}

export interface ListOrganizationResponseDto {
  organizations: OrganizationEntity[];
}


