import crypto from "crypto";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { AppError } from "../../shared/errors/app-error";
import {
  HASH_ALPHABET_CODE,
  decryptData,
  encryptData,
  hashSha256,
} from "../../shared/utils/core/crypto.helper";
import type { LicenseRepository } from "./license.repository";
import type {
  ActivateLicenseServiceInput,
  ActivateLicenseServiceResult,
  GetLicenseForDeviceServiceInput,
  GetLicenseForDeviceServiceResult,
  GetLicensesServiceInput,
  GetLicensesServiceResult,
  PurchaseLicenseServiceInput,
  PurchaseLicenseServiceResult,
} from "./license.types";

export class LicenseService {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  private _generateReadableLicenseKey(): string {
    const generateSegment = (length: number) => {
      let result = "";
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        const byte = randomBytes[i];
        if (byte !== undefined) {
          result += HASH_ALPHABET_CODE.charAt(byte % HASH_ALPHABET_CODE.length);
        }
      }
      return result;
    };
    return `LIC-${generateSegment(5)}-${generateSegment(5)}-${generateSegment(5)}`;
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async getLicenses(
    input: GetLicensesServiceInput,
  ): Promise<GetLicensesServiceResult> {
    const orgIdFilter = input.effectiveTenant.organizationId;
    const branchIdFilter =
      input.effectiveTenant.branchId || input.filters.branchId || undefined;
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { licenses: rows, total } = await this.licenseRepository.getLicenses({
      organizationId: orgIdFilter,
      branchId: branchIdFilter,
      page,
      limit,
      search: input.filters.search,
      status: input.filters.status,
      sortBy: input.filters.sortBy,
      sortOrder: input.filters.sortOrder,
    });

    const decryptedRows = rows.map((row) => {
      return {
        ...row,
        licenseKey: decryptData(row.licenseKey, env.LICENSE_ENCRYPTION_KEY),
      };
    });

    return {
      licenses: decryptedRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async purchaseLicense(
    input: PurchaseLicenseServiceInput,
  ): Promise<PurchaseLicenseServiceResult> {
    const qty = input.dto.quantity || 1;
    const organizationId = input.effectiveTenant.organizationId;
    const branchId =
      input.dto.branchId || input.effectiveTenant.branchId || null;

    const newLicenses = [];
    for (let i = 0; i < qty; i++) {
      const plaintextKey = this._generateReadableLicenseKey();
      const encryptedKey = encryptData(
        plaintextKey,
        env.LICENSE_ENCRYPTION_KEY,
      );
      const keyHash = hashSha256(plaintextKey);

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

      newLicenses.push({
        licenseKey: encryptedKey,
        licenseKeyHash: keyHash,
        organizationId,
        branchId,
        status: LicenseStatusEnum.AVAILABLE,
        expiresAt,
        createdBy: input.userId,
        updatedBy: input.userId,
      });
    }

    const created = await this.licenseRepository.createLicenses({
      licenses: newLicenses,
    });

    const resultLicenses = created.map(({ createdBy, updatedBy, ...rest }) => {
      return {
        ...rest,
        licenseKey: decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY),
      };
    });

    return {
      licenses: resultLicenses,
    };
  }

  // ========================================
  // ? DEVICE CLIENT SERVICES
  // ========================================
  async getLicenseForDevice(
    input: GetLicenseForDeviceServiceInput,
  ): Promise<GetLicenseForDeviceServiceResult> {
    const activeLicense = await this.licenseRepository.findActiveByDeviceId({
      deviceId: input.deviceId,
    });
    if (activeLicense) {
      const {
        createdBy,
        updatedBy,
        licenseKey: _lk,
        licenseKeyHash: _lkh,
        ...rest
      } = activeLicense;
      return { license: rest };
    }

    const anyLicense = await this.licenseRepository.findByDeviceId({
      deviceId: input.deviceId,
    });
    if (anyLicense) {
      const {
        createdBy,
        updatedBy,
        licenseKey: _lk,
        licenseKeyHash: _lkh,
        ...rest
      } = anyLicense;
      const isExpired = rest.expiresAt && new Date(rest.expiresAt) < new Date();
      return {
        license: {
          ...rest,
          status: isExpired ? LicenseStatusEnum.EXPIRED : rest.status,
        },
      };
    }

    return { license: null };
  }

  async activateLicenseByKey(
    input: ActivateLicenseServiceInput,
  ): Promise<ActivateLicenseServiceResult> {
    const keyHash = hashSha256(input.dto.licenseKey);

    const license = await this.licenseRepository.findByKeyHash({
      licenseKeyHash: keyHash,
    });

    if (!license) {
      throw new AppError("Invalid license key. No such license found.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (license.status === LicenseStatusEnum.ACTIVE && license.deviceId) {
      throw new AppError(
        "This license key is already activated on another device.",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
        },
      );
    }

    if (license.status === LicenseStatusEnum.REVOKED) {
      throw new AppError("This license has been revoked.", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    const activated = await this.licenseRepository.activate({
      licenseId: license.id,
      deviceId: input.deviceId,
      branchId: license.branchId ?? input.deviceBranchId,
    });

    const { createdBy, updatedBy, ...rest } = activated;

    rest.licenseKey = decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY);

    return { license: rest };
  }
}
