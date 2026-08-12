import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type {
  CreateOrganizationEntity,
  OrganizationEntity,
} from "./organization.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface CreateOrganizationServiceInput {
  dto: {
    name: string;
  };
  user?: UserTokenDto;
}

export interface CreateOrganizationServiceResult {
  organization: OrganizationEntity;
}

export interface ListOrganizationServiceInput {
  dto: {
    orgIds?: string[];
  };
}

export interface ListOrganizationServiceResult {
  organizations: OrganizationEntity[];
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface CreateOrganizationRepoInput {
  data: CreateOrganizationEntity;
}
export type CreateOrganizationRepoResult = OrganizationEntity;

export interface FindOrganizationByIdRepoInput {
  id: string;
}
export type FindOrganizationByIdRepoResult = OrganizationEntity | undefined;

export interface FindOrganizationByNameRepoInput {
  name: string;
}
export type FindOrganizationByNameRepoResult = OrganizationEntity | undefined;

export interface FindAllOrganizationsRepoInput {
  orgIds?: string[];
}
export type FindAllOrganizationsRepoResult = OrganizationEntity[];
