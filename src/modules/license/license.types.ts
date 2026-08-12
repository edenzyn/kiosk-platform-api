import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type { LicenseDiscountRuleEntity } from "./schemas/license-discount-rule.schema";
import type { LicensePricingEntity } from "./schemas/license-pricing.schema";
import type { LicenseEntity } from "./schemas/license.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetLicenseForDeviceServiceInput {
  deviceId: string;
}

export interface GetLicenseForDeviceServiceResult {
  license: (Omit<
    LicenseEntity,
    "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"
  > & { gracePeriodExpiresAt?: string }) | null;
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
    quantity: number;
    pricingPlanId: string;
  };
  effectiveTenant: EffectiveTenant;
  userId: string;
}

export interface PurchaseLicenseServiceResult {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}

export interface AssignLicenseToBranchServiceInput {
  licenseId: string;
  branchId: string;
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface AssignLicenseToBranchServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface AssignLicenseToDeviceServiceInput {
  licenseId: string;
  deviceId: string;
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface AssignLicenseToDeviceServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface GetDiscountRulesServiceInput {
  targetEntity: number;
}

export interface GetDiscountRulesServiceResult {
  rules: LicenseDiscountRuleEntity[];
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
  transaction?: {
    userId: string;
    transactionType: number;
    subtotalAmount: string;
    discountAmount: string;
    discountPercentage?: string;
    appliedDiscountRuleId?: string | null;
    totalAmount: string;
    currency: string;
    paymentStatus: number;
  };
  transactionItems?: Array<{
    actionType: number;
    durationDays: number;
    baseUnitPrice: string;
    discountPercentage?: string;
    unitPrice: string;
  }>;
}

export type CreateLicensesRepoResult = LicenseEntity[];

export interface UpdateLicenseRepoInput {
  licenseId: string;
  data: Partial<
    Pick<
      LicenseEntity,
      "branchId" | "deviceId" | "status" | "activatedAt" | "updatedBy"
    >
  >;
}
export type UpdateLicenseRepoResult = LicenseEntity;

export interface FindLicenseByIdRepoInput {
  licenseId: string;
  organizationId: string;
}
export type FindLicenseByIdRepoResult = LicenseEntity | null;

export interface GetLicensePricingPlansServiceInput {
  id?: string;
}

export interface GetLicensePricingPlansServiceResult {
  plans: LicensePricingEntity[];
}

export interface GetLicensePricingPlansRepoInput {
  id?: string;
}

export type GetLicensePricingPlansRepoResult = LicensePricingEntity[];

export interface FindActiveDiscountRulesRepoInput {
  targetEntity: number;
}

export type FindActiveDiscountRulesRepoResult = LicenseDiscountRuleEntity[];
