import type { OrganizationEntity } from "./organization.schema";

export interface CreateOrganizationResponseDto {
  organization: OrganizationEntity;
}

export interface GetOrganizationResponseDto {
  organization: OrganizationEntity;
}

export interface ListOrganizationResponseDto {
  organizations: OrganizationEntity[];
}

export interface UpdateOrganizationResponseDto {
  organization: OrganizationEntity;
}

export interface DeleteOrganizationResponseDto {
  success: boolean;
}
