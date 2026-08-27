import type { LicenseEntity } from "../schemas/license.schema";

export interface InitiateLicensePurchaseRequestDto {
  quantity: number;
  pricingPlanId: string;
  discountRuleId?: string;
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
  pricingPlanId: string;
  discountRuleId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PurchaseLicenseResponseDto {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}
