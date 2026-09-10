import type { LicenseEntity } from "../schemas/license.schema";

export interface BillingInfoDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

export interface InitiateLicensePurchaseRequestDto {
  quantity: number;
  licensePlanId: string;
  discountRuleId?: string;
  marketId?: string;
  billingInfo: BillingInfoDto;
}

export interface InitiateLicensePurchaseResponseDto {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
}

export interface PurchaseLicenseRequestDto {
  quantity: number;
  licensePlanId: string;
  discountRuleId?: string;
  marketId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PurchaseLicenseResponseDto {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}
