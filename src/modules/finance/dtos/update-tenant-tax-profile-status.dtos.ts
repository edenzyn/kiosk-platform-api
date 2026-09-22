import type { TenantTaxProfileWithComponents } from "../finance.types";

export interface UpdateTenantTaxProfileStatusBodyDto {
  id: string;
  isActive: boolean;
}

export interface UpdateTenantTaxProfileStatusResponseDto {
  profile: TenantTaxProfileWithComponents;
}
