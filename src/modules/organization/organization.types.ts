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
export interface FindOneOrganizationRepoInput {
  id?: string;
  name?: string;
}
export type FindOneOrganizationRepoResult = OrganizationEntity | undefined;

export interface FindAllOrganizationsRepoInput {
  orgIds?: string[];
}
export type FindAllOrganizationsRepoResult = OrganizationEntity[];

export interface CreateOrganizationRepoInput {
  data: CreateOrganizationEntity;
}
export type CreateOrganizationRepoResult = OrganizationEntity;
