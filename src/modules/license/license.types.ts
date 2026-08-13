import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type { LicenseDiscountRuleEntity } from "./schemas/license-discount-rule.schema";
import type { LicensePricingEntity } from "./schemas/license-pricing.schema";
import type { LicenseEntity } from "./schemas/license.schema";
import type { LicenseHistoryEntity } from "./schemas/license-history.schema";
import type { LicenseTransactionItemEntity } from "./schemas/license-transaction-item.schema";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";

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

export interface ExtendLicenseServiceInput {
  licenseId: string;
  dto: {
    pricingPlanId: string;
  };
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface ExtendLicenseServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface GetLicenseHistoryServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseHistoryServiceResult {
  history: (LicenseHistoryEntity & {
    performedByName: string | null;
    performedByEmail: string | null;
  })[];
}

export interface GetLicenseDetailsServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseDetailsServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "licenseKeyHash" | "updatedBy"> & {
    branchName: string | null;
    deviceName: string | null;
  };
  transactions: (Omit<LicenseTransactionItemEntity, "licenseId"> & {
    paymentStatus: number | null;
    currency: string | null;
    totalAmount: string | null;
    performedByName: string | null;
  })[];
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
  expiresAt: Date;
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
    expiresAt?: Date | null;
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

export interface CreateLicenseHistoryRepoInput {
  licenseId: string;
  eventType: LicenseHistoryEventTypeEnum;
  previousStatus: LicenseStatusEnum;
  newStatus: LicenseStatusEnum;
  previousExpiresAt?: Date | null;
  newExpiresAt?: Date | null;
  performedBy?: string | null;
  remarks?: string | null;
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

export interface ExtendLicenseRepoInput {
  licenseId: string;
  newExpiresAt: Date;
  newStatus: number;
  transaction: {
    userId: string;
    transactionType: number;
    subtotalAmount: string;
    discountAmount: string;
    discountPercentage: string;
    appliedDiscountRuleId: string | null;
    totalAmount: string;
    currency: string;
    paymentStatus: number;
  };
  transactionItem: {
    actionType: number;
    durationDays: number;
    baseUnitPrice: string;
    discountPercentage: string;
    unitPrice: string;
  };
  historyEvent: {
    eventType: number;
    previousStatus: number;
    previousExpiresAt: Date | null;
    remarks: string;
  };
}

export type ExtendLicenseRepoResult = LicenseEntity;

export interface GetLicenseHistoryRepoInput {
  licenseId: string;
}

export type GetLicenseHistoryRepoResult = (LicenseHistoryEntity & {
  performedByName: string | null;
  performedByEmail: string | null;
})[];

export interface GetLicenseDetailsRepoInput {
  licenseId: string;
}

export interface GetLicenseDetailsRepoResult {
  license: (Omit<LicenseEntity, "createdBy" | "licenseKeyHash" | "updatedBy"> & {
    branchName: string | null;
    deviceName: string | null;
  }) | null;
  transactions: (Omit<LicenseTransactionItemEntity, "licenseId"> & {
    paymentStatus: number | null;
    currency: string | null;
    totalAmount: string | null;
    performedByName: string | null;
  })[];
}
