import type { LicenseEntity } from "../schemas/license.schema";

export interface ActivateLicenseRequestDto {
  licenseKey: string;
}

export interface ActivateLicenseResponseDto {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}
