import type { TenantTaxProfileWithComponents } from "../finance.types";

export interface GetTenantTaxProfileResponseDto {
  /** A branch that has never configured tax has no profile yet. */
  profile: TenantTaxProfileWithComponents | null;
}
