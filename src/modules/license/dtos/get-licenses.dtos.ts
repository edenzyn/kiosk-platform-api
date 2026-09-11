import type { LicenseEntity } from "../schemas/license.schema";

export interface GetLicensesRequestDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  branchId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface LicenseWithDetails extends Omit<
  LicenseEntity,
  "createdBy" | "updatedBy"
> {
  branchName: string | null;
  deviceName: string | null;
  organizationName?: string | null;
  // Only populated for reseller-owned license listings (findByReseller).
  durationDays?: number | null;
}

export interface GetLicensesResponseDto {
  licenses: LicenseWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
