import { env } from "../../../config/env";
import { AppTaxComponentConditionTypeEnum } from "../../enums/finance/app-tax-component-condition-type.enum";
import type { TaxProfileWithComponents } from "../../../modules/finance/finance.types";

export interface TaxComponentBreakdown {
  name: string;
  rate: string;
  amount: number;
  taxProfileId: string;
  taxComponentId: string;
}

export interface TaxBreakdown {
  components: TaxComponentBreakdown[];
  totalTax: number;
  isInclusive: boolean;
  grandTotal: number;
}

// Mirrors user-client's calculateTaxBreakdown (licensePurchaseDialogUtils.ts)
// so the amount actually charged always matches what the buyer previewed.
export function calculateTaxBreakdown(
  taxProfile: TaxProfileWithComponents | null,
  taxableAmount: number,
  billingCountry?: string | null,
  billingState?: string | null,
): TaxBreakdown | null {
  if (!taxProfile || !taxProfile.isActive) return null;

  const isIntraState =
    !!billingCountry &&
    !!billingState &&
    billingCountry.trim().toLowerCase() === env.COMPANY_COUNTRY.trim().toLowerCase() &&
    billingState.trim().toLowerCase() === env.COMPANY_STATE.trim().toLowerCase();

  const applicableComponents = taxProfile.components.filter((component) => {
    if (!component.isActive) return false;
    if (component.conditionType === AppTaxComponentConditionTypeEnum.ALWAYS) {
      return true;
    }
    if (!billingCountry || !billingState) return false;
    if (component.conditionType === AppTaxComponentConditionTypeEnum.INTRA_STATE) {
      return isIntraState;
    }
    if (component.conditionType === AppTaxComponentConditionTypeEnum.INTER_STATE) {
      return !isIntraState;
    }
    return false;
  });

  if (applicableComponents.length === 0) return null;

  const totalRatePercent = applicableComponents.reduce(
    (sum, component) => sum + Number(component.rate),
    0,
  );

  if (totalRatePercent <= 0) return null;

  const isInclusive = taxProfile.isTaxInclusive;

  if (isInclusive) {
    const baseAmount = taxableAmount / (1 + totalRatePercent / 100);
    const components = applicableComponents.map((component) => ({
      name: component.name,
      rate: component.rate,
      amount: baseAmount * (Number(component.rate) / 100),
      taxProfileId: taxProfile.id,
      taxComponentId: component.id,
    }));
    const totalTax = taxableAmount - baseAmount;

    return {
      components,
      totalTax,
      isInclusive: true,
      grandTotal: taxableAmount,
    };
  }

  const components = applicableComponents.map((component) => ({
    name: component.name,
    rate: component.rate,
    amount: taxableAmount * (Number(component.rate) / 100),
    taxProfileId: taxProfile.id,
    taxComponentId: component.id,
  }));
  const totalTax = components.reduce((sum, component) => sum + component.amount, 0);

  return {
    components,
    totalTax,
    isInclusive: false,
    grandTotal: taxableAmount + totalTax,
  };
}
