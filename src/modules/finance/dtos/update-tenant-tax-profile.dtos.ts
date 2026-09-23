import type { TenantTaxProfileWithComponents } from "../finance.types";

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
