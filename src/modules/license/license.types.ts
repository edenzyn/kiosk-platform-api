import type { LicenseEntity } from "./schemas/license.schema";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetLicenseForDeviceServiceInput {
  deviceId: string;
}

export interface GetLicenseForDeviceServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"> | null;
}

export interface ActivateLicenseServiceInput {
  dto: {
    licenseKey: string;
  };
  deviceId: string;
  deviceBranchId: string;
}

export interface ActivateLicenseServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface GetLicensesServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    branchId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export interface GetLicensesServiceResult {
  licenses: LicenseWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseLicenseServiceInput {
  dto: {
    quantity?: number;
    branchId?: string;
  };
  effectiveTenant: EffectiveTenant;
  userId: string;
}

export interface PurchaseLicenseServiceResult {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindLicenseByDeviceIdRepoInput {
  deviceId: string;
}
export type FindLicenseByDeviceIdRepoResult = LicenseEntity | null;

export interface FindActiveLicenseByDeviceIdRepoInput {
  deviceId: string;
}
export type FindActiveLicenseByDeviceIdRepoResult = LicenseEntity | null;

export interface FindLicenseByKeyHashRepoInput {
  licenseKeyHash: string;
}
export type FindLicenseByKeyHashRepoResult = LicenseEntity | null;

export interface ActivateLicenseRepoInput {
  licenseId: string;
  deviceId: string;
  branchId?: string | null;
}
export type ActivateLicenseRepoResult = LicenseEntity;

export interface GetLicensesRepoInput {
  organizationId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetLicensesRepoResult {
  licenses: LicenseWithDetails[];
  total: number;
}

export interface CreateLicensesRepoInput {
  licenses: Array<{
    licenseKey: string;
    licenseKeyHash: string;
    organizationId: string;
    branchId: string | null;
    status: number;
    expiresAt: Date;
    createdBy: string;
    updatedBy: string;
  }>;
}

export type CreateLicensesRepoResult = LicenseEntity[];
