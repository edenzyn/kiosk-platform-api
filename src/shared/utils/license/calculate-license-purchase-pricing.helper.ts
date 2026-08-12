export function calculateLicensePurchasePricing(
  basePrice: number,
  qty: number,
  discountPercentage: number = 0,
) {
  const subtotal = basePrice * qty;
  const discountAmount = subtotal * (discountPercentage / 100);
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
