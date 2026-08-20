import { LicenseDiscountTypeEnum } from "../../enums/license/license-discount-type.enum";

export function calculateLicensePurchasePricing(
  basePrice: number,
  qty: number,
  discountValue: number = 0,
  discountType: LicenseDiscountTypeEnum = LicenseDiscountTypeEnum.PERCENTAGE,
) {
  const subtotal = basePrice * qty;
  const isFlat = discountType === LicenseDiscountTypeEnum.FLAT;
  const discountAmount = isFlat
    ? Math.min(discountValue, subtotal)
    : subtotal * (discountValue / 100);
  // Flat discounts don't have a meaningful percentage of their own, matching
  // how the frontend's calculateRuleDiscount treats them.
  const discountPercentage = isFlat ? 0 : discountValue;
  const totalAmount = subtotal - discountAmount;
  const unitPrice = totalAmount / qty;

  return {
    subtotal: subtotal.toFixed(2),
    discountPercentage: discountPercentage.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    unitPrice: unitPrice.toFixed(2),
    baseUnitPrice: basePrice.toFixed(2),
  };
}
