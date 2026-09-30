import { fromMinorUnits, toMinorUnits } from "../finance/currency.helper";

export interface OrderPricingLineInput {
  unitPrice: string;
  optionPrices: string[];
  takeawayChargeUnitAmount: string;
  quantity: number;
}

export interface OrderPricingTaxComponentInput {
  id: string;
  name: string;
  rate: string;
}

export interface OrderPricingLine {
  modifiersUnitAmount: string;
  takeawayChargeUnitAmount: string;
  lineSubtotal: string;
  takeawayChargeAmount: string;
  lineTotal: string;
}

export interface OrderPricingTax {
  taxComponentId: string;
  taxName: string;
  taxRate: string;
  taxAmount: string;
}

export interface OrderPricing<T extends OrderPricingLineInput> {
  lines: (Omit<T, keyof OrderPricingLine> & OrderPricingLine)[];
  taxes: OrderPricingTax[];
  subtotalAmount: string;
  takeawayChargeAmount: string;
  amountBeforeTax: string;
  taxAmount: string;
  totalAmount: string;
}

export function calculateOrderPricing<T extends OrderPricingLineInput>(
  lines: T[],
  taxComponents: OrderPricingTaxComponentInput[],
  isTaxInclusive: boolean,
  currencyCode: string,
): OrderPricing<T> {
  const pricedLines = lines.map((line) => {
    const modifiersUnit = line.optionPrices.reduce(
      (sum, price) => sum + toMinorUnits(price, currencyCode),
      0,
    );
    const takeawayUnit = toMinorUnits(
      line.takeawayChargeUnitAmount,
      currencyCode,
    );
    const lineSubtotal =
      (toMinorUnits(line.unitPrice, currencyCode) + modifiersUnit) *
      line.quantity;
    const takeawayCharge = takeawayUnit * line.quantity;

    return {
      modifiersUnit,
      takeawayUnit,
      lineSubtotal,
      takeawayCharge,
      lineTotal: lineSubtotal + takeawayCharge,
      line,
    };
  });

  const subtotal = pricedLines.reduce(
    (sum, line) => sum + line.lineSubtotal,
    0,
  );
  const takeawayCharge = pricedLines.reduce(
    (sum, line) => sum + line.takeawayCharge,
    0,
  );
  const taxableAmount = subtotal + takeawayCharge;

  const totalRatePercent = taxComponents.reduce(
    (sum, component) => sum + Number(component.rate),
    0,
  );
  const taxBase =
    isTaxInclusive && totalRatePercent > 0
      ? taxableAmount / (1 + totalRatePercent / 100)
      : taxableAmount;
  const taxes =
    totalRatePercent > 0
      ? taxComponents.map((component) => ({
          taxComponentId: component.id,
          taxName: component.name,
          taxRate: component.rate,
          taxAmount: Math.round(taxBase * (Number(component.rate) / 100)),
        }))
      : [];
  const taxAmount = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);

  const totalAmount = isTaxInclusive
    ? taxableAmount
    : taxableAmount + taxAmount;
  const amountBeforeTax = isTaxInclusive
    ? taxableAmount - taxAmount
    : taxableAmount;

  return {
    lines: pricedLines.map((line) => ({
      ...line.line,
      modifiersUnitAmount: fromMinorUnits(line.modifiersUnit, currencyCode),
      takeawayChargeUnitAmount: fromMinorUnits(line.takeawayUnit, currencyCode),
      lineSubtotal: fromMinorUnits(line.lineSubtotal, currencyCode),
      takeawayChargeAmount: fromMinorUnits(line.takeawayCharge, currencyCode),
      lineTotal: fromMinorUnits(line.lineTotal, currencyCode),
    })),
    taxes: taxes.map((tax) => ({
      ...tax,
      taxAmount: fromMinorUnits(tax.taxAmount, currencyCode),
    })),
    subtotalAmount: fromMinorUnits(subtotal, currencyCode),
    takeawayChargeAmount: fromMinorUnits(takeawayCharge, currencyCode),
    amountBeforeTax: fromMinorUnits(amountBeforeTax, currencyCode),
    taxAmount: fromMinorUnits(taxAmount, currencyCode),
    totalAmount: fromMinorUnits(totalAmount, currencyCode),
  };
}
