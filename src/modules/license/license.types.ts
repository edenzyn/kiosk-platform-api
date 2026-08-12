import type { LicenseEntity } from "./schemas/license.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetLicenseForDeviceServiceInput {
  deviceId: string;
}

export interface GetLicenseForDeviceServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy"> | null;
}

export interface ActivateLicenseServiceInput {
  dto: {
    licenseKey: string;
  };
  deviceId: string;
}

export interface ActivateLicenseServiceResult {
  license: Omit<LicenseEntity, "createdBy" | "updatedBy">;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindLicenseByDeviceIdRepoInput {
  deviceId: string;
}
export type FindLicenseByDeviceIdRepoResult = LicenseEntity | null;

export interface FindActiveLicenseByDeviceIdRepoInput {
  deviceId: string;
}
export type FindActiveLicenseByDeviceIdRepoResult = LicenseEntity | null;

export interface FindLicenseByKeyRepoInput {
  licenseKey: string;
}
export type FindLicenseByKeyRepoResult = LicenseEntity | null;

export interface ActivateLicenseRepoInput {
  licenseId: string;
  deviceId: string;
}
export type ActivateLicenseRepoResult = LicenseEntity;
