import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseRedemptionStatusEnum } from "../../shared/enums/license/license-redemption-status.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import type { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type { LicenseDiscountRuleEntity } from "./schemas/license-discount-rule.schema";
import type { LicensePricingEntity } from "./schemas/license-pricing.schema";
import type { LicenseRedemptionCodeEntity } from "./schemas/license-redemption-code.schema";
import type { LicenseRedemptionItemEntity } from "./schemas/license-redemption-item.schema";
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
  deviceType: DeviceTypeEnum;
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
    deviceType?: DeviceTypeEnum;
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
    discountRuleId?: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
  effectiveTenant: EffectiveTenant;
  userId: string;
}

export interface PurchaseLicenseServiceResult {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}

export interface ResolvedPurchasePricing {
  selectedPlan: LicensePricingEntity;
  durationDays: number;
  currency: string;
  appliedDiscountRuleId: string | null;
  subtotal: string;
  discountPercentage: string;
  discountAmount: string;
  totalAmount: string;
  unitPrice: string;
  baseUnitPrice: string;
}

export interface InitiateLicensePurchaseServiceInput {
  dto: {
    quantity: number;
    pricingPlanId: string;
    discountRuleId?: string;
  };
  userId: string;
}

export interface InitiateLicensePurchaseServiceResult {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
}

export interface RedeemLicenseCodeServiceInput {
  dto: {
    redeemCode: string;
  };
  effectiveTenant: EffectiveTenant;
  userId: string;
}

export interface RedeemLicenseCodeServiceResult {
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
    deviceType?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export type GetLicensesForResellerServiceResult = GetLicensesServiceResult;

export interface GetAvailableLicensesForRedemptionServiceInput {
  resellerId: string;
  filters: {
    page?: number;
    limit?: number;
  };
}

export type GetAvailableLicensesForRedemptionServiceResult =
  GetLicensesServiceResult;

export interface PurchaseLicenseAsResellerServiceInput {
  dto: {
    quantity: number;
    pricingPlanId: string;
    discountRuleId?: string;
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

export interface RedemptionCodeWithItems extends Omit<
  LicenseRedemptionCodeEntity,
  "redeemCodeHash"
> {
  items: LicenseRedemptionItemEntity[];
}

export interface RedemptionCodeWithItemCount extends Omit<
  LicenseRedemptionCodeEntity,
  "redeemCodeHash"
> {
  itemCount: number;
}

export interface GenerateRedemptionCodeServiceInput {
  resellerId: string;
  dto: {
    licenseIds: string[];
    redeemExpiresAt?: Date | null;
    remarks?: string;
  };
}
export interface GenerateRedemptionCodeServiceResult {
  redemptionCode: RedemptionCodeWithItems;
}

export interface GetRedemptionCodeDetailsForResellerServiceInput {
  resellerId: string;
  redemptionId: string;
}
export interface RedemptionItemWithLicenseKey extends LicenseRedemptionItemEntity {
  licenseKey: string;
}
export interface GetRedemptionCodeDetailsForResellerServiceResult {
  redemptionCode: Omit<LicenseRedemptionCodeEntity, "redeemCodeHash"> & {
    items: RedemptionItemWithLicenseKey[];
  };
}

export interface VerifyRedemptionCodeServiceInput {
  resellerId: string;
  redemptionId: string;
  dto: {
    totalSoldPrice: number;
    currency: string;
    items: Array<{ licenseId: string; soldPrice: number }>;
  };
}
export type VerifyRedemptionCodeServiceResult = boolean;

export interface GetRedemptionCodesForResellerServiceInput {
  resellerId: string;
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: LicenseRedemptionStatusEnum;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}
export interface GetRedemptionCodesForResellerServiceResult {
  redemptionCodes: RedemptionCodeWithItemCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RevokeRedemptionCodeServiceInput {
  resellerId: string;
  redemptionId: string;
}
export type RevokeRedemptionCodeServiceResult = boolean;

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
  resellerId?: string;
}

export interface GetDiscountRulesServiceResult {
  rules: DiscountRuleWithTargets[];
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
    currency?: string;
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

export interface UpdateDiscountRuleServiceInput {
  ruleId: string;
  dto: CreateDiscountRuleServiceInput["dto"];
  currentUser: UserTokenDto;
}

export interface UpdateDiscountRuleServiceResult {
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

export interface CreatePricingPlanServiceInput {
  dto: {
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    price: number;
    currency: string;
  };
  currentUser: UserTokenDto;
}

export interface CreatePricingPlanServiceResult {
  plan: LicensePricingEntity;
}

export interface TogglePricingPlanStatusServiceInput {
  planId: string;
  currentUser: UserTokenDto;
}

export interface TogglePricingPlanStatusServiceResult {
  plan: LicensePricingEntity;
}

export interface UpdatePricingPlanServiceInput {
  planId: string;
  dto: {
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    price: number;
    currency: string;
  };
  currentUser: UserTokenDto;
}

export interface UpdatePricingPlanServiceResult {
  plan: LicensePricingEntity;
}

export interface ExtendLicenseServiceInput {
  licenseId: string;
  dto: {
    pricingPlanId?: string;
  };
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface ExtendLicenseServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface GetLicenseExtendInfoServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface LicenseExtendLockedPricing {
  planName: string | null;
  basePrice: string;
  soldPrice: string | null;
  currency: string;
  durationDays: number;
}

export interface GetLicenseExtendInfoServiceResult {
  isRedeemed: boolean;
  lockedPricing: LicenseExtendLockedPricing | null;
}

export interface FindRedemptionPricingForLicenseRepoResult {
  pricingId: string | null;
  planName: string | null;
  basePrice: string;
  soldPrice: string | null;
  currency: string;
  durationDays: number;
}

export interface GetLicenseHistoryServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseHistoryServiceResult {
  history: LicenseHistoryLogItem[];
}

export interface GetLicenseDetailsServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseDetailsServiceResult {
  license: LicenseDetailsResult;
  transactions: LicenseDetailsTransactionItem[];
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
  viewerUserType: UserTypeEnums;
}

export type LicenseDetailsResult = {
  id: string;
  licenseKey: string;
  organizationId: string | null;
  organizationName: string | null;
  branchId: string | null;
  branchName: string | null;
  deviceId: string | null;
  deviceName: string | null;
  status: number;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LicenseDetailsTransactionItem = {
  id: string;
  transactionId: string;
  actionType: number;
  durationDays: number;
  baseUnitPrice: string;
  discountPercentage: string | null;
  unitPrice: string;
  createdAt: string;
  paymentStatus: number | null;
  currency: string | null;
  totalAmount: string | null;
  performedByName: string | null;
};

export type FindOneLicenseDetailsRepoResult = LicenseDetailsResult | null;

export interface FindLicenseTransactionsRepoInput {
  licenseId: string;
  viewerUserType: UserTypeEnums;
}
export type FindLicenseTransactionsRepoResult = LicenseDetailsTransactionItem[];

export interface FindLicensesRepoInput {
  organizationId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  deviceType?: DeviceTypeEnum;
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
  deviceType?: DeviceTypeEnum;
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

export interface FindOwnedAvailableLicensesRepoInput {
  resellerId: string;
  licenseIds: string[];
}
export type FindOwnedAvailableLicensesRepoResult = LicenseEntity[];

export interface FindLicenseIdsWithActiveRedemptionRepoInput {
  licenseIds: string[];
}
export type FindLicenseIdsWithActiveRedemptionRepoResult = string[];

export interface FindAvailableLicensesForRedemptionRepoInput {
  resellerId: string;
  page?: number;
  limit?: number;
}
export interface FindAvailableLicensesForRedemptionRepoResult {
  licenses: LicenseWithDetails[];
  total: number;
}

export interface CreateRedemptionCodeRepoInput {
  resellerId: string;
  redeemCode: string;
  redeemCodeHash: string;
  status: LicenseRedemptionStatusEnum;
  redeemExpiresAt?: Date | null;
  remarks?: string | null;
  createdBy: string;
  updatedBy: string;
  items: Array<{
    licenseId: string;
    pricingId?: string | null;
    basePrice: string;
    soldPrice: string | null;
    currency: string;
    durationDays: number;
  }>;
}
export type CreateRedemptionCodeRepoResult = RedemptionCodeWithItems;

export interface FindRedemptionCodesByResellerRepoInput {
  resellerId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: LicenseRedemptionStatusEnum;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindRedemptionCodesByResellerRepoResult {
  redemptionCodes: RedemptionCodeWithItemCount[];
  total: number;
}

export interface FindRedemptionCodeByIdRepoInput {
  id: string;
  resellerId: string;
}
export type FindRedemptionCodeByIdRepoResult = RedemptionCodeWithItems | null;

export interface RevokeRedemptionCodeRepoInput {
  id: string;
  resellerId: string;
}
export type RevokeRedemptionCodeRepoResult =
  | LicenseRedemptionCodeEntity
  | undefined;

export interface FindRedemptionCodeDetailsByIdRepoInput {
  id: string;
  resellerId: string;
}
export interface FindRedemptionCodeDetailsByIdRepoResult {
  code: Omit<LicenseRedemptionCodeEntity, "redeemCodeHash">;
  items: RedemptionItemWithLicenseKey[];
}

export interface VerifyRedemptionCodeRepoInput {
  id: string;
  resellerId: string;
  totalSoldPrice: string;
  currency: string;
  items: Array<{ licenseId: string; soldPrice: string }>;
}
export type VerifyRedemptionCodeRepoResult = boolean;

export interface FindRedemptionCodeByHashRepoInput {
  redeemCodeHash: string;
}
export type FindRedemptionCodeByHashRepoResult =
  LicenseRedemptionCodeEntity | null;

export interface ClaimRedemptionCodeRepoInput {
  redeemCodeHash: string;
  organizationId: string;
  branchId: string | null;
  claimedByUserId: string;
}
export type ClaimRedemptionCodeRepoResult =
  | { ok: true; licenses: LicenseEntity[] }
  | { ok: false; reason: "not_claimable" | "licenses_unavailable" };

export type FindLatestPurchaseSnapshotRepoResult = {
  durationDays: number;
  baseUnitPrice: string;
  currency: string;
} | null;

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
  historyTargetEntityType?: LicenseHistoryTargetEntityTypeEnum;
  transaction?: {
    userId: string;
    subtotalAmount: string;
    discountAmount: string;
    discountPercentage?: string;
    appliedDiscountRuleId?: string | null;
    totalAmount: string;
    currency: string;
    paymentStatus: number;
    paymentProvider?: number;
    paymentReference?: string;
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
    targetEntityType: LicenseHistoryTargetEntityTypeEnum;
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
  resellerId?: string;
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
  currency?: string | null;
  minQuantity: number;
  maxQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  resellerIds?: string[];
  pricingPlanIds?: string[];
  createdBy: string;
}
export type CreateDiscountRuleWithTargetsRepoResult = LicenseDiscountRuleEntity;

export interface UpdateDiscountRuleWithTargetsRepoInput {
  ruleId: string;
  name: string;
  targetEntity: number;
  discountType: number;
  discountValue: number;
  currency?: string | null;
  minQuantity: number;
  maxQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  resellerIds?: string[];
  pricingPlanIds?: string[];
  updatedBy: string;
}
export type UpdateDiscountRuleWithTargetsRepoResult = LicenseDiscountRuleEntity;

export interface FindOneDiscountRuleRepoInput {
  ruleId: string;
}
export type FindOneDiscountRuleRepoResult = LicenseDiscountRuleEntity | null;

export interface UpdateDiscountRuleRepoInput {
  ruleId: string;
  updatedBy: string;
  data: Partial<
    Pick<
      LicenseDiscountRuleEntity,
      | "name"
      | "isActive"
      | "minQuantity"
      | "maxQuantity"
      | "startsAt"
      | "endsAt"
    >
  >;
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

export interface CreatePricingPlanRepoInput {
  name: string;
  deviceType: DeviceTypeEnum;
  durationDays: number;
  price: number;
  currency: string;
  createdBy: string;
}
export type CreatePricingPlanRepoResult = LicensePricingEntity;

export interface FindOnePricingPlanRepoInput {
  id: string;
}
export type FindOnePricingPlanRepoResult = LicensePricingEntity | null;

export interface UpdatePricingPlanRepoInput {
  id: string;
  updatedBy: string;
  data: Partial<{
    isActive: boolean;
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    price: string;
    currency: string;
  }>;
}
export type UpdatePricingPlanRepoResult = LicensePricingEntity;

// License History Schema
export interface FindLicenseHistoryRepoInput {
  licenseId: string;
  targetEntityTypes: LicenseHistoryTargetEntityTypeEnum[];
  viewerType: UserTypeEnums.NORMAL | UserTypeEnums.RESELLER;
}

export type LicenseHistoryLogItem = {
  id: string;
  licenseId: string;
  eventType: number;
  targetEntityType: number;
  previousStatus: number | null;
  newStatus: number | null;
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  transactionId: string | null;
  remarks: string | null;
  performedBy: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  createdAt: string;
};
export type FindLicenseHistoryRepoResult = LicenseHistoryLogItem[];

export interface CreateLicenseHistoryRepoInput {
  licenseId: string;
  eventType: LicenseHistoryEventTypeEnum;
  targetEntityType: LicenseHistoryTargetEntityTypeEnum;
  previousStatus: LicenseStatusEnum;
  newStatus: LicenseStatusEnum;
  previousExpiresAt?: Date | null;
  newExpiresAt?: Date | null;
  performedBy?: string | null;
  remarks?: string | null;
}
export type CreateLicenseHistoryRepoResult = void;
