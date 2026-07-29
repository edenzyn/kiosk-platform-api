import type { OrganizationEntity } from "./organization.schema";

// --- Create ---
export interface CreateOrganizationRequestDto {
  name: string;
}

export interface CreateOrganizationResponseDto {
  organization: OrganizationEntity;
}

// --- Get By Id ---
export interface GetOrganizationRequestDto {
  id: string;
}

export interface GetOrganizationResponseDto {
  organization: OrganizationEntity;
}

// --- List ---
export interface ListOrganizationRequestDto {
  orgIds?: string[];
}

export interface ListOrganizationResponseDto {
  organizations: OrganizationEntity[];
}

// --- Update ---
export interface UpdateOrganizationRequestDto {
  id: string;
  name?: string;
  isActive?: boolean;
}

export interface UpdateOrganizationResponseDto {
  organization: OrganizationEntity;
}

// --- Delete ---
export interface DeleteOrganizationRequestDto {
  id: string;
}

export interface DeleteOrganizationResponseDto {
  success: boolean;
}
