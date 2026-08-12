import type { LicenseEntity } from "../schemas/license.schema";

export interface LicenseStatusResponseDto {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy"> | null;
}
