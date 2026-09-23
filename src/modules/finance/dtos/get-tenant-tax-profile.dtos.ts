import type { TaxComponentConditionTypeEnum } from "../../../shared/enums/finance/tax-component-condition-type.enum";
import type { TenantTaxProfileWithComponents } from "../finance.types";

export interface GetTenantTaxProfileQueryDto {
  conditionTypes?: TaxComponentConditionTypeEnum[];
}

export interface GetTenantTaxProfileResponseDto {
  /** A branch that has never configured tax has no profile yet. */
  profile: TenantTaxProfileWithComponents | null;
}
