import type { TenantTaxProfileWithComponents } from "../types/tax.types";

export interface TenantTaxComponentBodyDto {
  id?: string;
  name: string;
  conditionType: number;
  rate: number;
}

export interface UpdateTenantTaxProfileBodyDto {
  name: string;
  isTaxInclusive?: boolean;
  components: TenantTaxComponentBodyDto[];
}

export interface UpdateTenantTaxProfileResponseDto {
  profile: TenantTaxProfileWithComponents;
}
