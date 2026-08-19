import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type { LicenseDiscountRuleEntity } from "./schemas/license-discount-rule.schema";
import type { LicenseHistoryEntity } from "./schemas/license-history.schema";
import type { LicensePricingEntity } from "./schemas/license-pricing.schema";
import type { LicenseTransactionItemEntity } from "./schemas/license-transaction-item.schema";
import type { LicenseEntity } from "./schemas/license.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetLicenseForDeviceServiceInput {
  deviceId: string;
}

export interface GetLicenseForDeviceServiceResult {
  license:
    | (Omit<
        LicenseEntity,
        "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"
      > & { gracePeriodExpiresAt?: string })
    | null;
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

// ========================================
// ? RESELLER CLIENT SERVICES
// ========================================
export interface GetLicensesForResellerServiceInput {
  resellerId: string;
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: LicenseStatusEnum;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export type GetLicensesForResellerServiceResult = GetLicensesServiceResult;

export interface PurchaseLicenseAsResellerServiceInput {
  dto: {
    quantity: number;
    pricingPlanId: string;
  };
  resellerId: string;
}

export type PurchaseLicenseAsResellerServiceResult =
  PurchaseLicenseServiceResult;

export interface GetLicenseHistoryForResellerServiceInput {
  licenseId: string;
  resellerId: string;
}
export type GetLicenseHistoryForResellerServiceResult =
  GetLicenseHistoryServiceResult;

export interface GetLicenseDetailsForResellerServiceInput {
  licenseId: string;
  resellerId: string;
}
export type GetLicenseDetailsForResellerServiceResult =
  GetLicenseDetailsServiceResult;

export interface AssignLicenseToBranchServiceInput {
  licenseId: string;
  branchId: string;
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface AssignLicenseToBranchServiceResult {
  license: LicenseWithDetails;
}

export interface AssignLicenseToDeviceServiceInput {
  licenseId: string;
  deviceId: string;
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface AssignLicenseToDeviceServiceResult {
  license: LicenseWithDetails;
}

export interface GetLicensePricingPlansServiceInput {
  id?: string;
}

export interface GetLicensePricingPlansServiceResult {
  plans: LicensePricingEntity[];
}

export interface GetDiscountRulesServiceInput {
  targetEntity: number;
}

export interface GetDiscountRulesServiceResult {
  rules: LicenseDiscountRuleEntity[];
}

// ========================================
// ? PLATFORM CLIENT SERVICES (Discount Rules & Pricing)
// ========================================
export interface DiscountRuleTarget {
  id: string;
  name: string;
}

export type DiscountRuleWithTargets = LicenseDiscountRuleEntity & {
  targets: DiscountRuleTarget[];
};

export interface GetPlatformDiscountRulesServiceInput {
  query: {
    page?: number;
    limit?: number;
    search?: string;
    targetEntity?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export interface GetPlatformDiscountRulesServiceResult {
  rules: DiscountRuleWithTargets[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDiscountRuleServiceInput {
  dto: {
    name: string;
    targetEntity: number;
    discountType: number;
    discountValue: number;
    minQuantity: number;
    maxQuantity?: number | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    resellerIds?: string[];
    pricingPlanIds?: string[];
  };
  currentUser: UserTokenDto;
}

export interface CreateDiscountRuleServiceResult {
  rule: DiscountRuleWithTargets;
}

export interface ToggleDiscountRuleStatusServiceInput {
  ruleId: string;
  currentUser: UserTokenDto;
}

export interface ToggleDiscountRuleStatusServiceResult {
  rule: LicenseDiscountRuleEntity;
}

export interface GetPlatformPricingPlansServiceInput {
  query: {
    isActive?: boolean;
  };
}

export interface GetPlatformPricingPlansServiceResult {
  plans: LicensePricingEntity[];
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

export interface CheckLicenseStatusServiceInput {
  licenseId?: string;
}

export interface CheckLicenseStatusServiceResult {
  checkedCount: number;
  updatedCount: number;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================

// License Schema
export interface FindOneLicenseRepoInput {
  id?: string;
  deviceId?: string;
  licenseKeyHash?: string;
  organizationId?: string;
}
export type FindOneLicenseRepoResult = LicenseEntity | null;

export interface FindOneActiveLicenseByDeviceIdRepoInput {
  deviceId: string;
}
export type FindOneActiveLicenseByDeviceIdRepoResult = LicenseEntity | null;

export interface FindOneLicenseDetailsRepoInput {
  licenseId: string;
}
export interface FindOneLicenseDetailsRepoResult {
  license:
    | (Omit<LicenseEntity, "createdBy" | "licenseKeyHash" | "updatedBy"> & {
        branchName: string | null;
        deviceName: string | null;
      })
    | null;
  transactions: (Omit<LicenseTransactionItemEntity, "licenseId"> & {
    paymentStatus: number | null;
    currency: string | null;
    totalAmount: string | null;
    performedByName: string | null;
  })[];
}

export interface FindLicensesRepoInput {
  organizationId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindLicensesRepoResult {
  licenses: LicenseWithDetails[];
  total: number;
}

export interface FindLicensesByResellerRepoInput {
  resellerId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindLicensesByResellerRepoResult {
  licenses: LicenseWithDetails[];
  total: number;
}

export interface IsLicenseOwnedByResellerRepoInput {
  licenseId: string;
  resellerId: string;
}
export type IsLicenseOwnedByResellerRepoResult = boolean;

export interface FindLicensesForStatusCheckRepoInput {
  statuses?: number[];
}
export type FindLicensesForStatusCheckRepoResult = LicenseEntity[];

export interface CreateLicensesRepoInput {
  licenses: Array<{
    licenseKey: string;
    licenseKeyHash: string;
    organizationId: string | null;
    branchId: string | null;
    status: number;
    expiresAt?: Date | null;
    createdBy: string;
    updatedBy: string;
  }>;
  resellerId?: string;
  historyTargetEntityType?: UserTypeEnums;
  transaction?: {
    userId: string;
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

export interface ActivateLicenseRepoInput {
  licenseId: string;
  deviceId: string;
  branchId?: string | null;
  expiresAt: Date;
}
export type ActivateLicenseRepoResult = LicenseEntity;

export interface ExtendLicenseRepoInput {
  licenseId: string;
  newExpiresAt: Date;
  newStatus: number;
  transaction: {
    userId: string;
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
    eventType: LicenseHistoryEventTypeEnum;
    targetEntityType: UserTypeEnums;
    previousStatus: LicenseStatusEnum;
    previousExpiresAt: Date | null;
    remarks: string;
  };
}
export type ExtendLicenseRepoResult = LicenseEntity;

export interface UpdateLicenseRepoInput {
  licenseId: string;
  data: Partial<
    Pick<
      LicenseEntity,
      | "branchId"
      | "deviceId"
      | "status"
      | "activatedAt"
      | "expiresAt"
      | "updatedBy"
    >
  >;
}
export type UpdateLicenseRepoResult = LicenseEntity & {
  branchName: string | null;
  deviceName: string | null;
};

// Pricing & Discount Schema
export interface FindLicensePricingPlansRepoInput {
  id?: string;
  isActive?: boolean;
}
export type FindLicensePricingPlansRepoResult = LicensePricingEntity[];

export interface FindActiveDiscountRulesRepoInput {
  targetEntity: number;
}
export type FindActiveDiscountRulesRepoResult = LicenseDiscountRuleEntity[];

export interface FindPaginatedDiscountRulesRepoInput {
  page: number;
  limit: number;
  search?: string;
  targetEntity?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindPaginatedDiscountRulesRepoResult {
  rules: LicenseDiscountRuleEntity[];
  total: number;
}

export interface FindDiscountRuleTargetsRepoInput {
  ruleIds: string[];
  targetEntity: number;
}
export type FindDiscountRuleTargetsRepoResult = Map<
  string,
  DiscountRuleTarget[]
>;

export interface CreateDiscountRuleWithTargetsRepoInput {
  name: string;
  targetEntity: number;
  discountType: number;
  discountValue: number;
  minQuantity: number;
  maxQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  resellerIds?: string[];
  pricingPlanIds?: string[];
  createdBy: string;
}
export type CreateDiscountRuleWithTargetsRepoResult = LicenseDiscountRuleEntity;

export interface FindOneDiscountRuleRepoInput {
  ruleId: string;
}
export type FindOneDiscountRuleRepoResult = LicenseDiscountRuleEntity | null;

export interface UpdateDiscountRuleRepoInput {
  ruleId: string;
  updatedBy: string;
  data: Partial<Pick<LicenseDiscountRuleEntity, "name" | "isActive" | "minQuantity" | "maxQuantity" | "startsAt" | "endsAt">>;
}
export type UpdateDiscountRuleRepoResult = LicenseDiscountRuleEntity;

export interface FindPricingPlansPaginatedRepoInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}
export interface FindPricingPlansPaginatedRepoResult {
  plans: LicensePricingEntity[];
  total: number;
}

// License History Schema
export interface FindLicenseHistoryRepoInput {
  licenseId: string;
}
export type FindLicenseHistoryRepoResult = (LicenseHistoryEntity & {
  performedByName: string | null;
  performedByEmail: string | null;
})[];

export interface CreateLicenseHistoryRepoInput {
  licenseId: string;
  eventType: LicenseHistoryEventTypeEnum;
  targetEntityType: UserTypeEnums;
  previousStatus: LicenseStatusEnum;
  newStatus: LicenseStatusEnum;
  previousExpiresAt?: Date | null;
  newExpiresAt?: Date | null;
  performedBy?: string | null;
  remarks?: string | null;
}
export type CreateLicenseHistoryRepoResult = void;
