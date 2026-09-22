import type { TenantTaxProfileWithComponents } from "../finance.types";
import type { CreateTenantTaxProfileBodyDto } from "./create-tenant-tax-profile.dtos";

export interface UpdateTenantTaxProfileBodyDto
  extends CreateTenantTaxProfileBodyDto {
  id: string;
}

export interface UpdateTenantTaxProfileResponseDto {
  profile: TenantTaxProfileWithComponents;
}
