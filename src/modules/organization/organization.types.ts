import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { UserEntity } from "../user/schemas/user.schema";
import type {
  GetOrganizationsRequestDto,
  GetOrganizationsResponseDto,
} from "./dtos/get-organizations.dtos";
import type {
  InviteOrganizationRequestDto,
  InviteOrganizationResponseDto,
} from "./dtos/invite-organization.dtos";
import type { ToggleOrganizationStatusResponseDto } from "./dtos/toggle-organization-status.dtos";
import type { OrganizationEntity } from "./organization.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface InviteOrganizationServiceInput {
  dto: InviteOrganizationRequestDto;
  currentUser: UserTokenDto;
}
export type InviteOrganizationServiceResult = InviteOrganizationResponseDto;

export interface GetOrganizationsServiceInput {
  query: GetOrganizationsRequestDto;
}
export type GetOrganizationsServiceResult = GetOrganizationsResponseDto;

export interface ToggleOrganizationStatusServiceInput {
  organizationId: string;
  currentUser: UserTokenDto;
}
export type ToggleOrganizationStatusServiceResult =
  ToggleOrganizationStatusResponseDto;

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneOrganizationRepoInput {
  id?: string;
  name?: string;
}
export type FindOneOrganizationRepoResult = OrganizationEntity | undefined;

export interface FindPaginatedOrganizationsRepoInput {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindPaginatedOrganizationsRepoResult {
  organizations: OrganizationEntity[];
  total: number;
}

export interface UpdateOrganizationRepoInput {
  id: string;
  data: Partial<
    Pick<
      OrganizationEntity,
      | "name"
      | "registeredName"
      | "registrationNumber"
      | "isActive"
      | "updatedBy"
    >
  >;
}
export type UpdateOrganizationRepoResult = OrganizationEntity;

export interface CreateOrganizationWithOwnerRepoInput {
  organizationName: string;
  registeredName: string;
  registrationNumber: string;
  invitationId: string;
  owner: {
    name: string;
    email: string;
    hashedPassword: string;
  };
  defaultRoles: {
    name: string;
    permissions: string[];
    isSystem?: boolean;
    rank: number;
  }[];
  keyToIdMap: Map<string, string>;
}
export interface CreateOrganizationWithOwnerRepoResult {
  organization: OrganizationEntity;
  user: UserEntity;
  ownerRoleId: string;
}
