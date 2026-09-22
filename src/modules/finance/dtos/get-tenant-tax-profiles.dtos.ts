import type { TenantTaxProfileWithComponents } from "../finance.types";

export interface GetTenantTaxProfilesResponseDto {
  profiles: TenantTaxProfileWithComponents[];
}
