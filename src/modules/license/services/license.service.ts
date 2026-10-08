import dayjs from "dayjs";
import { env } from "../../../config/env";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { BadRequestError } from "../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../shared/errors/forbidden-error";
import { NotFoundError } from "../../../shared/errors/not-found-error";
import {
  decryptData,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import type { DeviceRepository } from "../../device/device.repository";
import { LicenseMapper } from "../license.mapper";
import type {
  ActivateLicenseServiceInput,
  ActivateLicenseServiceResult,
  AssignLicenseToBranchServiceInput,
  AssignLicenseToBranchServiceResult,
  AssignLicenseToDeviceServiceInput,
  AssignLicenseToDeviceServiceResult,
  CheckLicenseStatusServiceInput,
  CheckLicenseStatusServiceResult,
  CreateLicenseHistoryRepoInput,
  GetLicenseDetailsForResellerServiceInput,
  GetLicenseDetailsForResellerServiceResult,
  GetLicenseDetailsServiceInput,
  GetLicenseDetailsServiceResult,
  GetLicenseForDeviceServiceInput,
  GetLicenseForDeviceServiceResult,
  GetLicenseHistoryForResellerServiceInput,
  GetLicenseHistoryForResellerServiceResult,
  GetLicenseHistoryServiceInput,
  GetLicenseHistoryServiceResult,
  GetLicensesForResellerServiceInput,
  GetLicensesForResellerServiceResult,
  GetLicensesServiceInput,
  GetLicensesServiceResult,
} from "../license.types";
import type { LicenseTransactionRepository } from "../repositories/license-transaction.repository";
import type { LicenseRepository } from "../repositories/license.repository";
import type { LicenseEntity } from "../schemas/license.schema";

export class LicenseService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  private async _checkActiveLicenseExists(
    deviceId: string,
    excludeLicenseId?: string,
  ): Promise<void> {
    const activeLicense = await this.licenseRepository.findOneActiveByDeviceId({
      deviceId,
    });
    if (activeLicense && activeLicense.id !== excludeLicenseId) {
      throw new BadRequestError(
        "Device already has an active license assigned",
      );
    }
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  // Normal User methods
  async getLicenses(
    input: GetLicensesServiceInput,
  ): Promise<GetLicensesServiceResult> {
    const orgIdFilter = input.effectiveTenant.organizationId;
    const branchIdFilter =
      input.effectiveTenant.branchId || input.filters.branchId || undefined;
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { licenses: rows, total } = await this.licenseRepository.find({
      organizationId: orgIdFilter,
      branchId: branchIdFilter,
      page,
      limit,
      search: input.filters.search,
      status: input.filters.status,
      deviceType: input.filters.deviceType,
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

  async assignLicenseToBranch(
    input: AssignLicenseToBranchServiceInput,
  ): Promise<AssignLicenseToBranchServiceResult> {
    const orgId = input.effectiveTenant.organizationId;
    if (!orgId) {
      throw new BadRequestError("Organization ID is required");
    }

    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
      organizationId: orgId,
    });

    if (!license) {
      throw new NotFoundError("License not found");
    }

    if (license.branchId) {
      throw new BadRequestError("License is already assigned to a branch");
    }

    const updated = await this.licenseRepository.update({
      licenseId: license.id,
      data: {
        branchId: input.branchId,
        updatedBy: input.userId,
      },
    });

    await this._createLicenseHistory({
      licenseId: license.id,
      eventType: LicenseHistoryEventTypeEnum.ASSIGNMENT,
      targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
      previousStatus: license.status,
      newStatus: license.status,
      previousExpiresAt: license.expiresAt,
      newExpiresAt: license.expiresAt,
      performedBy: input.userId,
      remarks: "Assigned to branch",
    });

    const { createdBy, updatedBy, ...rest } = updated;
    rest.licenseKey = decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY);

    return {
      license: rest,
    };
  }

  async assignLicenseToDevice(
    input: AssignLicenseToDeviceServiceInput,
  ): Promise<AssignLicenseToDeviceServiceResult> {
    const orgId = input.effectiveTenant.organizationId;
    if (!orgId) {
      throw new BadRequestError("Organization ID is required");
    }

    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
      organizationId: orgId,
    });

    if (!license) {
      throw new NotFoundError("License not found");
    }

    if (license.deviceId) {
      throw new BadRequestError("License is already assigned to a device");
    }

    const device = await this.deviceRepository.findOne({
      id: input.deviceId,
      organizationId: orgId,
    });
    if (!device) {
      throw new NotFoundError("Device not found");
    }

    if (license.branchId && license.branchId !== device.branchId) {
      throw new BadRequestError(
        "This license was purchased for a different branch and cannot be assigned to this device.",
      );
    }

    if (license.deviceType !== device.deviceType) {
      throw new BadRequestError(
        "This license was purchased for a different device type and cannot be assigned to this device.",
      );
    }

    await this._checkActiveLicenseExists(input.deviceId);

    const purchaseItem =
      await this.licenseTransactionRepository.findOneLatestPurchaseItem(
        license.id,
      );
    const durationDays = purchaseItem?.durationDays as number;
    const expiresAt = dayjs().add(durationDays, "day").toDate();

    const updated = await this.licenseRepository.update({
      licenseId: license.id,
      data: {
        deviceId: input.deviceId,
        branchId: license.branchId ?? device.branchId,
        status: LicenseStatusEnum.ACTIVE,
        activatedAt: new Date(),
        expiresAt,
        updatedBy: input.userId,
      },
    });

    await this._createLicenseHistory({
      licenseId: license.id,
      eventType: LicenseHistoryEventTypeEnum.ACTIVATION,
      targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
      previousStatus: license.status,
      newStatus: LicenseStatusEnum.ACTIVE,
      previousExpiresAt: license.expiresAt,
      newExpiresAt: expiresAt,
      performedBy: input.userId,
      remarks: "Assigned to device",
    });

    const { createdBy, updatedBy, ...rest } = updated;
    rest.licenseKey = decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY);

    return {
      license: rest,
    };
  }

  async getLicenseHistory(
    input: GetLicenseHistoryServiceInput,
  ): Promise<GetLicenseHistoryServiceResult> {
    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
      organizationId: input.effectiveTenant.organizationId as string,
    });
    if (!license) {
      throw new NotFoundError("License not found");
    }

    const history = await this.licenseRepository.findHistory({
      licenseId: input.licenseId,
      targetEntityTypes: [
        LicenseHistoryTargetEntityTypeEnum.NORMAL,
        LicenseHistoryTargetEntityTypeEnum.COMMON,
      ],
      viewerType: UserTypeEnums.NORMAL,
    });

    return { history };
  }

  async getLicenseDetails(
    input: GetLicenseDetailsServiceInput,
  ): Promise<GetLicenseDetailsServiceResult> {
    const license = await this.licenseRepository.findOneDetails({
      licenseId: input.licenseId,
      viewerUserType: UserTypeEnums.NORMAL,
    });

    if (!license) {
      throw new NotFoundError("License not found");
    }

    if (
      input.effectiveTenant.organizationId &&
      license.organizationId !== input.effectiveTenant.organizationId
    ) {
      throw new ForbiddenError("Access denied to license");
    }

    const transactions =
      await this.licenseTransactionRepository.findTransactionsForLicense({
        licenseId: input.licenseId,
        viewerUserType: UserTypeEnums.NORMAL,
      });

    const decryptedLicense = {
      ...license,
      licenseKey: decryptData(license.licenseKey, env.LICENSE_ENCRYPTION_KEY),
    };

    return {
      license: decryptedLicense,
      transactions,
    };
  }

  // Reseller User methods
  async getLicensesForReseller(
    input: GetLicensesForResellerServiceInput,
  ): Promise<GetLicensesForResellerServiceResult> {
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { licenses: rows, total } =
      await this.licenseRepository.findByReseller({
        resellerId: input.resellerId,
        page,
        limit,
        search: input.filters.search,
        status: input.filters.status,
        deviceType: input.filters.deviceType,
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

  private async _checkLicenseOwnedByReseller(
    licenseId: string,
    resellerId: string,
  ): Promise<void> {
    const isOwned = await this.licenseRepository.isLicenseOwnedByReseller({
      licenseId,
      resellerId,
    });
    if (!isOwned) {
      throw new NotFoundError("License not found");
    }
  }

  async getLicenseHistoryForReseller(
    input: GetLicenseHistoryForResellerServiceInput,
  ): Promise<GetLicenseHistoryForResellerServiceResult> {
    await this._checkLicenseOwnedByReseller(input.licenseId, input.resellerId);

    const history = await this.licenseRepository.findHistory({
      licenseId: input.licenseId,
      targetEntityTypes: [
        LicenseHistoryTargetEntityTypeEnum.NORMAL,
        LicenseHistoryTargetEntityTypeEnum.RESELLER,
        LicenseHistoryTargetEntityTypeEnum.COMMON,
      ],
      viewerType: UserTypeEnums.RESELLER,
    });

    return { history };
  }

  async getLicenseDetailsForReseller(
    input: GetLicenseDetailsForResellerServiceInput,
  ): Promise<GetLicenseDetailsForResellerServiceResult> {
    await this._checkLicenseOwnedByReseller(input.licenseId, input.resellerId);

    const license = await this.licenseRepository.findOneDetails({
      licenseId: input.licenseId,
      viewerUserType: UserTypeEnums.RESELLER,
    });

    if (!license) {
      throw new NotFoundError("License not found");
    }

    const transactions =
      await this.licenseTransactionRepository.findTransactionsForLicense({
        licenseId: input.licenseId,
        viewerUserType: UserTypeEnums.RESELLER,
      });

    const decryptedLicense = {
      ...license,
      licenseKey: decryptData(license.licenseKey, env.LICENSE_ENCRYPTION_KEY),
    };

    return {
      license: decryptedLicense,
      transactions,
    };
  }

  // ========================================
  // ? DEVICE CLIENT SERVICES
  // ========================================
  private async _evaluateAndUpdateLicenseStatus(
    license: LicenseEntity,
  ): Promise<{
    license: LicenseEntity;
    updated: boolean;
    gracePeriodExpiresAt?: string;
  }> {
    const now = new Date();
    const expiresAtDate = license.expiresAt
      ? new Date(license.expiresAt)
      : null;

    if (!expiresAtDate || now <= expiresAtDate) {
      return { license, updated: false };
    }

    const gracePeriodDays = env.LICENSE_GRACE_PERIOD_DAYS;
    const gracePeriodEndDate = dayjs(expiresAtDate)
      .add(gracePeriodDays, "day")
      .toDate();

    if (license.status === LicenseStatusEnum.ACTIVE) {
      if (now >= gracePeriodEndDate) {
        const updated = await this.licenseRepository.update({
          licenseId: license.id,
          data: {
            status: LicenseStatusEnum.EXPIRED,
          },
        });
        await this._createLicenseHistory({
          licenseId: license.id,
          eventType: LicenseHistoryEventTypeEnum.EXPIRATION,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
          previousStatus: LicenseStatusEnum.ACTIVE,
          newStatus: LicenseStatusEnum.EXPIRED,
          previousExpiresAt: expiresAtDate,
          newExpiresAt: expiresAtDate,
          remarks:
            "License status changed from Active to Expired because grace period ended",
        });
        return { license: updated, updated: true };
      }

      const updated = await this.licenseRepository.update({
        licenseId: license.id,
        data: {
          status: LicenseStatusEnum.GRACE_PERIOD,
        },
      });
      await this._createLicenseHistory({
        licenseId: license.id,
        eventType: LicenseHistoryEventTypeEnum.GRACE_PERIOD,
        targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
        previousStatus: LicenseStatusEnum.ACTIVE,
        newStatus: LicenseStatusEnum.GRACE_PERIOD,
        previousExpiresAt: expiresAtDate,
        newExpiresAt: expiresAtDate,
        remarks: `License status changed to Grace Period (${gracePeriodDays} days) because it expired`,
      });
      return {
        license: updated,
        updated: true,
        gracePeriodExpiresAt: gracePeriodEndDate.toISOString(),
      };
    }

    if (license.status === LicenseStatusEnum.GRACE_PERIOD) {
      if (now >= gracePeriodEndDate) {
        const updated = await this.licenseRepository.update({
          licenseId: license.id,
          data: {
            status: LicenseStatusEnum.EXPIRED,
          },
        });
        await this._createLicenseHistory({
          licenseId: license.id,
          eventType: LicenseHistoryEventTypeEnum.EXPIRATION,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
          previousStatus: LicenseStatusEnum.GRACE_PERIOD,
          newStatus: LicenseStatusEnum.EXPIRED,
          previousExpiresAt: expiresAtDate,
          newExpiresAt: expiresAtDate,
          remarks:
            "License status changed from Grace Period to Expired because grace period ended",
        });
        return { license: updated, updated: true };
      }

      return {
        license,
        updated: false,
        gracePeriodExpiresAt: gracePeriodEndDate.toISOString(),
      };
    }

    return { license, updated: false };
  }

  async checkLicenseStatus(
    input?: CheckLicenseStatusServiceInput,
  ): Promise<CheckLicenseStatusServiceResult> {
    if (input?.licenseId) {
      const license = await this.licenseRepository.findOne({
        id: input.licenseId,
      });

      if (!license) {
        throw new NotFoundError("License not found");
      }

      const { updated } = await this._evaluateAndUpdateLicenseStatus(license);
      return {
        checkedCount: 1,
        updatedCount: updated ? 1 : 0,
      };
    }

    const licensesToCheck =
      await this.licenseRepository.findLicensesForStatusCheck();

    let updatedCount = 0;
    for (const license of licensesToCheck) {
      const { updated } = await this._evaluateAndUpdateLicenseStatus(license);
      if (updated) {
        updatedCount++;
      }
    }

    return {
      checkedCount: licensesToCheck.length,
      updatedCount,
    };
  }

  async getLicenseForDevice(
    input: GetLicenseForDeviceServiceInput,
  ): Promise<GetLicenseForDeviceServiceResult> {
    const activeLicense = await this.licenseRepository.findOneActiveByDeviceId({
      deviceId: input.deviceId,
    });
    if (activeLicense) {
      return { license: LicenseMapper.toDeviceAuthResponse(activeLicense) };
    }

    const anyLicense = await this.licenseRepository.findOne({
      deviceId: input.deviceId,
    });
    if (anyLicense) {
      const { license: evaluatedLicense, gracePeriodExpiresAt } =
        await this._evaluateAndUpdateLicenseStatus(anyLicense);

      return {
        license: LicenseMapper.toDeviceAuthResponse(
          evaluatedLicense,
          evaluatedLicense.status === LicenseStatusEnum.GRACE_PERIOD
            ? gracePeriodExpiresAt
            : undefined,
        ),
      };
    }

    return { license: null };
  }

  async activateLicenseByKey(
    input: ActivateLicenseServiceInput,
  ): Promise<ActivateLicenseServiceResult> {
    const keyHash = hashSha256(input.dto.licenseKey);

    const license = await this.licenseRepository.findOne({
      licenseKeyHash: keyHash,
      organizationId: input.deviceOrganizationId,
    });

    if (!license) {
      throw new NotFoundError("Invalid license key. No such license found.");
    }

    if (license.status === LicenseStatusEnum.ACTIVE || license.deviceId) {
      throw new ConflictError(
        "This license key is already activated on another device.",
      );
    }

    if (license.status === LicenseStatusEnum.REVOKED) {
      throw new ForbiddenError("This license has been revoked.");
    }

    if (license.branchId && license.branchId !== input.deviceBranchId) {
      throw new BadRequestError(
        "This license was purchased for a different branch and cannot be activated on this device.",
      );
    }

    if (license.deviceType !== input.deviceType) {
      throw new BadRequestError(
        "This license was purchased for a different device type and cannot be activated on this device.",
      );
    }

    await this._checkActiveLicenseExists(input.deviceId);

    const purchaseItem =
      await this.licenseTransactionRepository.findOneLatestPurchaseItem(
        license.id,
      );
    const durationDays = purchaseItem?.durationDays as number;
    const expiresAt = dayjs().add(durationDays, "day").toDate();

    const activated = await this.licenseRepository.activate({
      licenseId: license.id,
      deviceId: input.deviceId,
      branchId: license.branchId ?? input.deviceBranchId,
      expiresAt,
    });

    await this._createLicenseHistory({
      licenseId: license.id,
      eventType: LicenseHistoryEventTypeEnum.ACTIVATION,
      targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
      previousStatus: license.status,
      newStatus: LicenseStatusEnum.ACTIVE,
      previousExpiresAt: license.expiresAt,
      newExpiresAt: expiresAt,
      remarks: "License activated on device",
    });

    const { createdBy, updatedBy, ...rest } = activated;

    rest.licenseKey = decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY);

    return { license: rest };
  }

  private async _createLicenseHistory(
    input: CreateLicenseHistoryRepoInput,
  ): Promise<void> {
    await this.licenseRepository.createHistory(input);
  }
}
