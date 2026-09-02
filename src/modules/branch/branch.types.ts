import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { CreateBranchRequestDto } from "./dtos/create-branch.dtos";
import type { BranchEntity } from "./schemas/branch.schema";
import type { BranchSettingsEntity } from "./schemas/branch-settings.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface CreateBranchServiceInput {
  data: Omit<
    BranchEntity,
    "id" | "isActive" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateBranchServiceResult = BranchEntity;

export interface GetBranchesServiceInput {
  effectiveTenant: EffectiveTenant;
  filters?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: SortingOrderEnum;
  };
}

export interface GetBranchesServiceResult {
  branches: BranchEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetBranchesForFiltersServiceInput {
  effectiveTenant: EffectiveTenant;
}

export type GetBranchesForFiltersServiceResult = Array<{
  id: string;
  name: string;
}>;

export interface UpdateBranchServiceInput {
  data: {
    id: string;
    name?: string;
    email?: string | null;
    mobile?: string | null;
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    area?: string | null;
    landmark?: string | null;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type UpdateBranchServiceResult = BranchEntity;

export interface GetBranchDetailsServiceInput {
  branchId: string;
  effectiveTenant: EffectiveTenant;
}
export interface GetBranchDetailsServiceResult {
  branch: BranchEntity;
}

export interface UpdateBranchDetailsServiceInput {
  branchId: string;
  data: Partial<
    Pick<
      BranchEntity,
      | "name"
      | "email"
      | "mobile"
      | "country"
      | "state"
      | "city"
      | "postalCode"
      | "area"
      | "landmark"
      | "address"
    >
  >;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export interface UpdateBranchDetailsServiceResult {
  branch: BranchEntity;
}

export interface GetBranchSettingsServiceInput {
  branchId: string;
  effectiveTenant: EffectiveTenant;
}
export interface GetBranchSettingsServiceResult {
  settings: BranchSettingsEntity;
}

export interface UpdateBranchSettingsServiceInput {
  branchId: string;
  data: Partial<
    Pick<
      BranchSettingsEntity,
      "logoUrl" | "primaryColor" | "languageCode" | "currencyCode" | "timezone"
    >
  >;
  effectiveTenant: EffectiveTenant;
}
export interface UpdateBranchSettingsServiceResult {
  settings: BranchSettingsEntity;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneBranchRepoInput {
  id?: string;
  name?: string;
  organizationId?: string;
}
export type FindOneBranchRepoResult = BranchEntity | null;

export interface FindBranchesRepoInput {
  organizationId?: string;
  branchIds?: string[];
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindBranchesRepoResult {
  branches: BranchEntity[];
  total: number;
}

export interface FindBranchesForFiltersRepoInput {
  organizationId?: string;
  branchIds?: string[];
}
export type FindBranchesForFiltersRepoResult = Array<{
  id: string;
  name: string;
}>;

export interface CreateBranchRepoInput {
  data: CreateBranchRequestDto;
}
export type CreateBranchRepoResult = BranchEntity;

export interface UpdateBranchRepoInput {
  id: string;
  data: Partial<BranchEntity>;
}
export type UpdateBranchRepoResult = BranchEntity;

export interface UpdateBranchSettingsRepoInput {
  branchId: string;
  data: Partial<
    Pick<
      BranchSettingsEntity,
      "logoUrl" | "primaryColor" | "languageCode" | "currencyCode" | "timezone"
    >
  >;
}
export type UpdateBranchSettingsRepoResult = BranchSettingsEntity;
