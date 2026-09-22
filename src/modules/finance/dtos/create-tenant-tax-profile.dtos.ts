import type { TenantTaxProfileWithComponents } from "../finance.types";

export interface TenantTaxComponentBodyDto {
  /** Set on update to keep an existing component; absent means a new one. */
  id?: string;
  name: string;
  conditionType: number;
  rate: number;
  isActive?: boolean;
}

export interface CreateTenantTaxProfileBodyDto {
  name: string;
  isTaxInclusive?: boolean;
  components: TenantTaxComponentBodyDto[];
}

export interface CreateTenantTaxProfileResponseDto {
  profile: TenantTaxProfileWithComponents;
}
