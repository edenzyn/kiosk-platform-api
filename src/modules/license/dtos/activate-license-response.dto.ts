import type { LicenseEntity } from "../schemas/license.schema";

export interface ActivateLicenseResponseDto {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}
