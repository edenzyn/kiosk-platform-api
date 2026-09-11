import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import { LicenseDiscountTypeEnum } from "../../shared/enums/license/license-discount-type.enum";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseRedemptionStatusEnum } from "../../shared/enums/license/license-redemption-status.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import type { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type { BillingInfoDto } from "./dtos/purchase-license.dtos";
import type { LicensePlanDiscountRuleEntity } from "./schemas/license-plan-discount-rule.schema";
import type { LicensePlanEntity } from "./schemas/license-plan.schema";
import type { LicenseRedemptionCodeEntity } from "./schemas/license-redemption-code.schema";
import type { LicenseTermsEntity } from "./schemas/license-terms.schema";
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
    licensePlanId: string;
    discountRuleId?: string;
    marketId?: string;
    billingInfo: BillingInfoDto;
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

export interface ResolvedPurchaseTaxComponent {
  name: string;
  rate: string;
  amount: string;
  taxProfileId: string;
  taxComponentId: string;
}

export interface ResolvedPurchaseTax {
  components: ResolvedPurchaseTaxComponent[];
  totalTaxAmount: string;
  isInclusive: boolean;
}

export interface ResolvedPurchasePricing {
  selectedPlan: LicensePlanEntity;
  durationDays: number;
  marketId: string;
  currencyCode: string;
  appliedDiscountRuleId: string | null;
  subtotal: string;
  discountPercentage: string;
  discountType: number;
  discountValue: string;
  discountAmount: string;
  totalAmount: string;
  unitPrice: string;
  baseUnitPrice: string;
  tax: ResolvedPurchaseTax | null;
  // totalAmount already includes tax when tax is present — this is the
  // amount actually charged via Razorpay.
  chargeAmount: string;
}

export interface InitiateLicensePurchaseServiceInput {
  dto: {
    quantity: number;
    licensePlanId: string;
    discountRuleId?: string;
    marketId?: string;
    billingInfo: BillingInfoDto;
  };
  effectiveTenant: EffectiveTenant;
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
  taxAmount: string;
  taxComponents: ResolvedPurchaseTaxComponent[];
  isTaxInclusive: boolean;
  grandTotal: string;
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
    marketId: string;
  };
}

export type GetAvailableLicensesForRedemptionServiceResult =
  GetLicensesServiceResult;

export interface InitiateLicensePurchaseAsResellerServiceInput {
  dto: {
    quantity: number;
    licensePlanId: string;
    discountRuleId?: string;
    marketId: string;
    billingInfo: BillingInfoDto;
  };
  resellerId: string;
}

export type InitiateLicensePurchaseAsResellerServiceResult =
  InitiateLicensePurchaseServiceResult;

export interface PurchaseLicenseAsResellerServiceInput {
  dto: {
    quantity: number;
    licensePlanId: string;
    discountRuleId?: string;
    marketId: string;
    billingInfo: BillingInfoDto;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
  resellerId: string;
}

export type PurchaseLicenseAsResellerServiceResult =
  PurchaseLicenseServiceResult;

export interface CancelLicensePurchaseServiceInput {
  razorpayOrderId: string;
  userId: string;
  reason?: string;
}

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
> {}

export interface RedemptionCodeWithItemCount extends Omit<
  LicenseRedemptionCodeEntity,
  "redeemCodeHash"
> {
  marketCurrencyCode: string;
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
export interface RedemptionCodeLicenseDetail {
  licenseId: string;
  licenseKey: string;
  basePrice: string | null;
  lockedPrice: string | null;
  planName: string | null;
}
export interface GetRedemptionCodeDetailsForResellerServiceResult {
  redemptionCode: Omit<LicenseRedemptionCodeEntity, "redeemCodeHash"> & {
    marketCurrencyCode: string;
    licenses: RedemptionCodeLicenseDetail[];
  };
}

export interface VerifyRedemptionCodeServiceInput {
  resellerId: string;
  redemptionId: string;
  dto: {
    totalSoldPrice: number;
    items: Array<{ licenseId: string; lockedPrice: number }>;
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

export type LicensePlanWithPrice = LicensePlanEntity & {
  price: string | null;
  marketId?: string | null;
  currencyCode?: string | null;
};

export type LicensePlanWithMarketPrices = LicensePlanEntity & {
  marketPrices: Array<{
    marketId: string;
    marketName: string;
    currencyCode: string;
    price: string;
  }>;
};

export interface GetLicensePlansServiceInput {
  id?: string;
  marketId?: string;
  effectiveTenant?: EffectiveTenant;
}

export interface GetLicensePlansServiceResult {
  plans: LicensePlanWithMarketPrices[];
}

export interface GetDiscountRulesServiceInput {
  targetEntity: number;
  resellerId?: string;
  marketId?: string;
  effectiveTenant?: EffectiveTenant;
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

export type DiscountRuleWithTargets = LicensePlanDiscountRuleEntity & {
  targets: DiscountRuleTarget[];
};

export interface GetPlatformDiscountRulesServiceInput {
  query: {
    page?: number;
    limit?: number;
    search?: string;
    targetEntity?: number;
    isActive?: boolean;
    marketId?: string;
    discountType?: LicenseDiscountTypeEnum;
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
    scopeType: number;
    marketId?: string | null;
    minQuantity: number;
    maxQuantity?: number | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    resellerIds?: string[];
    licensePlanIds?: string[];
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
  rule: LicensePlanDiscountRuleEntity;
}

export interface GetPlatformLicensePlansServiceInput {
  query: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    marketId?: string;
  };
}

export interface GetPlatformLicensePlansServiceResult {
  plans: (LicensePlanWithMarketPrices | LicensePlanWithPrice)[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateLicensePlanServiceInput {
  dto: {
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    marketPrices: Array<{ marketId: string; price: number }>;
  };
  currentUser: UserTokenDto;
}

export interface CreateLicensePlanServiceResult {
  plan: LicensePlanWithMarketPrices;
}

export interface ToggleLicensePlanStatusServiceInput {
  planId: string;
  currentUser: UserTokenDto;
}

export interface ToggleLicensePlanStatusServiceResult {
  plan: LicensePlanEntity;
}

export interface UpdateLicensePlanServiceInput {
  planId: string;
  dto: {
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    marketPrices?: Array<{ marketId: string; price: number }>;
  };
  currentUser: UserTokenDto;
}

export interface UpdateLicensePlanServiceResult {
  plan: LicensePlanWithMarketPrices;
}

export interface ExtendLicenseServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

export interface InitiateLicenseExtendServiceInput {
  licenseId: string;
  dto: {
    licensePlanId?: string;
  };
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export type InitiateLicenseExtendServiceResult =
  InitiateLicensePurchaseServiceResult;

export interface VerifyLicenseExtendServiceInput {
  licenseId: string;
  dto: {
    licensePlanId?: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
  userId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseExtendInfoServiceInput {
  licenseId: string;
  effectiveTenant: EffectiveTenant;
}

export interface LicenseExtendLockedPricing {
  planName: string | null;
  lockedPrice: string | null;
  durationDays: number;
  marketId: string;
  currencyCode: string;
}

export interface GetLicenseExtendInfoServiceResult {
  isRedeemed: boolean;
  lockedPricing: LicenseExtendLockedPricing | null;
  marketId: string;
  currencyCode: string;
}

export interface FindRedemptionPricingForLicenseRepoResult {
  planId: string;
  lockedPlanName: string;
  basePrice: string;
  lockedPrice: string | null;
  durationDays: number;
  marketId: string;
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

export interface LicenseTransactionListItem {
  id: string;
  userId: string | null;
  performedByName: string | null;
  subtotalAmount: string;
  discountAmount: string;
  discountType: number | null;
  discountValue: string | null;
  totalAmount: string;
  marketId: string;
  paymentStatus: number | null;
  transactionAt: string | null;
  createdAt: string;
  itemCount: number;
}

export interface GetLicenseTransactionsServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: {
    page?: number;
    limit?: number;
  };
}

export interface GetLicenseTransactionsServiceResult {
  transactions: LicenseTransactionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetLicenseTransactionsForResellerServiceInput {
  resellerId: string;
  filters: {
    page?: number;
    limit?: number;
  };
}

export type GetLicenseTransactionsForResellerServiceResult =
  GetLicenseTransactionsServiceResult;

export interface LicenseTransactionDetail {
  id: string;
  userId: string | null;
  performedByName: string | null;
  subtotalAmount: string;
  discountAmount: string;
  discountType: number | null;
  discountValue: string | null;
  totalAmount: string;
  marketId: string;
  paymentStatus: number | null;
  paymentProvider: number | null;
  paymentReference: string | null;
  failureReason: string | null;
  transactionAt: string | null;
  createdAt: string;
}

export interface LicenseTransactionItemDetail {
  id: string;
  // Null until the purchase is finalized and a license is actually created.
  licenseId: string | null;
  licenseKey: string | null;
  deviceType: number | null;
  planId: string | null;
  planName: string | null;
  transactionType: number;
  durationDays: number;
  baseUnitPrice: string;
  discountType: number | null;
  discountValue: string | null;
  discountAmount: string | null;
  finalUnitPrice: string;
  createdAt: string;
}

export interface GetLicenseTransactionItemsServiceInput {
  transactionId: string;
  effectiveTenant: EffectiveTenant;
}

export interface GetLicenseTransactionItemsServiceResult {
  transaction: LicenseTransactionDetail;
  items: LicenseTransactionItemDetail[];
}

export interface GetLicenseTransactionItemsForResellerServiceInput {
  transactionId: string;
  resellerId: string;
}

export type GetLicenseTransactionItemsForResellerServiceResult =
  GetLicenseTransactionItemsServiceResult;

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
  planId: string | null;
  planName: string | null;
  transactionType: number;
  durationDays: number;
  baseUnitPrice: string;
  discountType: number | null;
  discountValue: string | null;
  discountAmount: string | null;
  finalUnitPrice: string;
  createdAt: string;
  paymentStatus: number | null;
  marketId: string | null;
  totalAmount: string | null;
  performedByName: string | null;
};

export type FindOneLicenseDetailsRepoResult = LicenseDetailsResult | null;

export interface FindLicenseTransactionsRepoInput {
  licenseId: string;
  viewerUserType: UserTypeEnums;
}
export type FindLicenseTransactionsRepoResult = LicenseDetailsTransactionItem[];

export interface FindLicenseTransactionsForOrganizationRepoInput {
  organizationId: string;
  branchId?: string | null;
  page?: number;
  limit?: number;
}

export interface FindLicenseTransactionsForOrganizationRepoResult {
  transactions: LicenseTransactionListItem[];
  total: number;
}

export interface FindLicenseTransactionsForResellerRepoInput {
  resellerId: string;
  page?: number;
  limit?: number;
}

export type FindLicenseTransactionsForResellerRepoResult =
  FindLicenseTransactionsForOrganizationRepoResult;

export interface FindTransactionWithItemsRepoInput {
  transactionId: string;
  organizationId?: string;
  branchId?: string | null;
  resellerId?: string;
}

export interface FindTransactionWithItemsRepoResult {
  transaction: LicenseTransactionDetail;
  items: LicenseTransactionItemDetail[];
}

export type LicenseTransactionListRow = {
  id: string;
  userId: string | null;
  performedByName: string | null;
  subtotalAmount: string;
  discountAmount: string;
  discountType: number | null;
  discountValue: string | null;
  totalAmount: string;
  marketId: string;
  paymentStatus: number | null;
  transactionAt: string | null;
  createdAt: string;
  itemCount: number;
  totalCount: string | number;
};

export type LicenseTransactionItemWithHeaderRow = {
  // Item fields are nullable: a transaction with no items yet (still
  // pending, cancelled, or failed before finalizing) returns exactly one
  // row with every item field NULL, so the transaction header is never lost.
  itemId: string | null;
  licenseId: string | null;
  licenseKey: string | null;
  deviceType: number | null;
  planId: string | null;
  planName: string | null;
  transactionType: number | null;
  durationDays: number | null;
  baseUnitPrice: string | null;
  discountType: number | null;
  discountValue: string | null;
  discountAmount: string | null;
  finalUnitPrice: string | null;
  itemCreatedAt: string | null;
  transactionId: string;
  userId: string | null;
  performedByName: string | null;
  subtotalAmount: string;
  transactionDiscountAmount: string;
  transactionDiscountType: number | null;
  transactionDiscountValue: string | null;
  totalAmount: string;
  marketId: string;
  paymentStatus: number | null;
  paymentProvider: number | null;
  paymentReference: string | null;
  failureReason: string | null;
  transactionAt: string | null;
  transactionCreatedAt: string;
};

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
  marketId: string;
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
  marketId: string;
  licenseIds: string[];
  status: LicenseRedemptionStatusEnum;
  redeemExpiresAt?: Date | null;
  remarks?: string | null;
  createdBy: string;
  updatedBy: string;
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
  marketCurrencyCode: string;
  licenses: RedemptionCodeLicenseDetail[];
}

export interface VerifyRedemptionCodeRepoInput {
  id: string;
  resellerId: string;
  totalSoldPrice: string;
  items: Array<{ licenseId: string; lockedPrice: string }>;
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

export interface FindLicensesForStatusCheckRepoInput {
  statuses?: number[];
}
export type FindLicensesForStatusCheckRepoResult = LicenseEntity[];

export interface CreatePendingLicenseTransactionRepoInput {
  userId: string;
  organizationId?: string | null;
  branchId?: string | null;
  marketId: string;
  transactionType: number;
  subtotalAmount: string;
  discountAmount: string;
  discountType?: number | null;
  discountValue?: string | null;
  appliedDiscountRuleId?: string | null;
  totalAmount: string;
  totalTaxAmount?: string;
  paymentStatus: number;
  paymentProvider: number;
  paymentProviderOrderId: string;
  intentPayload?: unknown;
  billingInfo?: BillingInfoDto;
  // Pre-created with a null licenseId — purchase items are known (quantity,
  // duration, price) before any license exists; finalize links them up.
  items?: Array<{
    planId: string;
    planName: string;
    transactionType: number;
    durationDays: number;
    baseUnitPrice: string;
    discountType?: number | null;
    discountValue?: string | null;
    discountAmount?: string;
    finalUnitPrice: string;
  }>;
  taxes?: ResolvedPurchaseTaxComponent[];
}
export interface CreatePendingLicenseTransactionRepoResult {
  id: string;
}

export interface FinalizeLicensePurchaseRepoInput {
  paymentProviderOrderId: string;
  userId: string;
  paymentReference: string;
  currentPaymentStatus: number;
  newPaymentStatus: number;
  resellerId?: string;
  historyTargetEntityType?: LicenseHistoryTargetEntityTypeEnum;
  licenses: Array<{
    licenseKey: string;
    licenseKeyHash: string;
    organizationId: string | null;
    branchId: string | null;
    marketId: string;
    currentPlanId: string;
    isRedeemed?: boolean;
    deviceType: number;
    status: number;
    expiresAt?: Date | null;
    createdBy: string;
    updatedBy: string;
  }>;
  transactionItems?: Array<{
    planId: string;
    planName: string;
    transactionType: number;
    durationDays: number;
    baseUnitPrice: string;
    discountType?: number | null;
    discountValue?: string | null;
    discountAmount?: string;
    finalUnitPrice: string;
  }>;
}
export type FinalizeLicensePurchaseRepoResult = LicenseEntity[] | null;

export interface CancelPendingLicenseTransactionRepoInput {
  paymentProviderOrderId: string;
  userId: string;
  currentPaymentStatus: number;
  newPaymentStatus: number;
  failureReason?: string;
}
export type CancelPendingLicenseTransactionRepoResult = boolean;

export interface UpdateTransactionStatusByOrderIdRepoInput {
  paymentProviderOrderId: string;
  currentPaymentStatus: number;
  newPaymentStatus: number;
  paymentReference?: string;
  failureReason?: string;
}
export type UpdateTransactionStatusByOrderIdRepoResult = boolean;

export interface ActivateLicenseRepoInput {
  licenseId: string;
  deviceId: string;
  branchId?: string | null;
  expiresAt: Date;
}
export type ActivateLicenseRepoResult = LicenseEntity;

export interface FinalizeLicenseExtendRepoInput {
  licenseId: string;
  paymentProviderOrderId: string;
  userId: string;
  paymentReference: string;
  currentPaymentStatus: number;
  newPaymentStatus: number;
  newExpiresAt: Date;
  newStatus: number;
  transactionItem: {
    planId: string;
    planName: string;
    transactionType: number;
    durationDays: number;
    baseUnitPrice: string;
    discountType?: number | null;
    discountValue?: string | null;
    discountAmount?: string;
    finalUnitPrice: string;
  };
  historyEvent: {
    eventType: LicenseHistoryEventTypeEnum;
    targetEntityType: LicenseHistoryTargetEntityTypeEnum;
    previousStatus: LicenseStatusEnum;
    previousExpiresAt: Date | null;
    remarks: string;
  };
}
export type FinalizeLicenseExtendRepoResult = LicenseEntity | null;

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
export interface FindLicensePlansRepoInput {
  id?: string;
  isActive?: boolean;
  marketId?: string;
}
export type FindLicensePlansRepoResult = LicensePlanWithPrice[];

export interface FindActiveDiscountRulesRepoInput {
  targetEntity: number;
  resellerId?: string;
  marketId?: string;
}
export type FindActiveDiscountRulesRepoResult = LicensePlanDiscountRuleEntity[];

export interface FindPaginatedDiscountRulesRepoInput {
  page: number;
  limit: number;
  search?: string;
  targetEntity?: number;
  isActive?: boolean;
  marketId?: string;
  discountType?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindPaginatedDiscountRulesRepoResult {
  rules: LicensePlanDiscountRuleEntity[];
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
  scopeType: number;
  marketId?: string | null;
  minQuantity: number;
  maxQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  resellerIds?: string[];
  licensePlanIds?: string[];
  createdBy: string;
}
export type CreateDiscountRuleWithTargetsRepoResult =
  LicensePlanDiscountRuleEntity;

export interface UpdateDiscountRuleWithTargetsRepoInput {
  ruleId: string;
  name: string;
  targetEntity: number;
  discountType: number;
  discountValue: number;
  scopeType: number;
  marketId?: string | null;
  minQuantity: number;
  maxQuantity?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  resellerIds?: string[];
  licensePlanIds?: string[];
  updatedBy: string;
}
export type UpdateDiscountRuleWithTargetsRepoResult =
  LicensePlanDiscountRuleEntity;

export interface FindOneDiscountRuleRepoInput {
  ruleId: string;
}
export type FindOneDiscountRuleRepoResult =
  LicensePlanDiscountRuleEntity | null;

export interface UpdateDiscountRuleRepoInput {
  ruleId: string;
  updatedBy: string;
  data: Partial<
    Pick<
      LicensePlanDiscountRuleEntity,
      | "name"
      | "isActive"
      | "minQuantity"
      | "maxQuantity"
      | "startsAt"
      | "endsAt"
    >
  >;
}
export type UpdateDiscountRuleRepoResult = LicensePlanDiscountRuleEntity;

export interface FindLicensePlansPaginatedRepoInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  marketId?: string;
}
export interface FindLicensePlansPaginatedRepoResult {
  plans: (LicensePlanWithMarketPrices | LicensePlanWithPrice)[];
  total: number;
}

export interface CreateLicensePlanRepoInput {
  name: string;
  deviceType: DeviceTypeEnum;
  durationDays: number;
  marketPrices: Array<{ marketId: string; price: number }>;
  createdBy: string;
}
export type CreateLicensePlanRepoResult = LicensePlanWithMarketPrices;

export interface FindOneLicensePlanRepoInput {
  id: string;
}
export type FindOneLicensePlanRepoResult = LicensePlanEntity | null;

export interface UpdateLicensePlanRepoInput {
  id: string;
  updatedBy: string;
  data: Partial<{
    isActive: boolean;
    name: string;
    deviceType: DeviceTypeEnum;
    durationDays: number;
    marketPrices: Array<{ marketId: string; price: number }>;
  }>;
}
export type UpdateLicensePlanRepoResult = LicensePlanWithMarketPrices;

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

// License Terms Schema
export interface CreateLicenseTermsForLicensesRepoInput {
  licenseIds: string[];
  marketId: string;
  createdBy: string;
}
export type CreateLicenseTermsForLicensesRepoResult = LicenseTermsEntity[];
