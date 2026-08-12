import type { LicenseEntity } from "../schemas/license.schema";

export interface PurchaseLicenseRequestDto {
  quantity: number;
  pricingPlanId: string;
}

export interface PurchaseLicenseResponseDto {
  licenses: Omit<LicenseEntity, "createdBy" | "updatedBy">[];
}
