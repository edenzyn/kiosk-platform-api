import type { LicenseEntity } from "../schemas/license.schema";

export interface LicenseStatusRequestDto {}

export interface LicenseStatusResponseDto {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"> | null;
}
