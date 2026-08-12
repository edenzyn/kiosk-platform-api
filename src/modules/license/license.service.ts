import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../shared/enums/license/license-transaction-action-type.enum";
import { LicenseTransactionTypeEnum } from "../../shared/enums/license/license-transaction-type.enum";
import { PaymentStatusEnum } from "../../shared/enums/license/payment-status.enum";
import { AppError } from "../../shared/errors/app-error";
import {
  decryptData,
  encryptData,
  hashSha256,
} from "../../shared/utils/core/crypto.helper";
import { calculateLicensePurchasePricing } from "../../shared/utils/license/calculate-license-purchase-pricing.helper";
import { generateReadableLicenseKey } from "../../shared/utils/license/generate-readable-license-key.helper";
import type { LicenseRepository } from "./license.repository";
import type {
  ActivateLicenseServiceInput,
  ActivateLicenseServiceResult,
  AssignLicenseToBranchServiceInput,
  AssignLicenseToBranchServiceResult,
  AssignLicenseToDeviceServiceInput,
  AssignLicenseToDeviceServiceResult,
  GetDiscountRulesServiceInput,
  GetDiscountRulesServiceResult,
  GetLicenseForDeviceServiceInput,
  GetLicenseForDeviceServiceResult,
  GetLicensePricingPlansServiceInput,
  GetLicensePricingPlansServiceResult,
  GetLicensesServiceInput,
  GetLicensesServiceResult,
  PurchaseLicenseServiceInput,
  PurchaseLicenseServiceResult,
} from "./license.types";

export class LicenseService {
  constructor(private readonly licenseRepository: LicenseRepository) {}

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
    const qty = input.dto.quantity;
    const organizationId = input.effectiveTenant.organizationId;
    const branchId = input.effectiveTenant.branchId || null;

    const pricingPlanId = input.dto.pricingPlanId;

    const plansResult = await this.getLicensePricingPlans({
      id: pricingPlanId,
    });
    const selectedPlan = plansResult.plans[0];

    if (!selectedPlan) {
      throw new AppError("Selected pricing plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const durationDays = selectedPlan.durationDays;
    const basePrice = Number(selectedPlan.price);
    const currency = selectedPlan.currency;

    const rules = await this.licenseRepository.findActiveDiscountRules({
      targetEntity: LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
    });

    const matchedRule = rules.find(
      (rule) =>
        qty >= rule.minQuantity &&
        (rule.maxQuantity === null || qty <= rule.maxQuantity),
    );

    let discountPct = 0.0;
    let appliedDiscountRuleId: string | null = null;

    if (matchedRule) {
      discountPct = Number(matchedRule.discountValue);
      appliedDiscountRuleId = matchedRule.id;
    }

    const {
      subtotal,
      discountPercentage,
      discountAmount,
      totalAmount,
      unitPrice,
      baseUnitPrice,
    } = calculateLicensePurchasePricing(basePrice, qty, discountPct);

    const newLicenses = [];
    for (let i = 0; i < qty; i++) {
      const plaintextKey = generateReadableLicenseKey();
      const encryptedKey = encryptData(
        plaintextKey,
        env.LICENSE_ENCRYPTION_KEY,
      );
      const keyHash = hashSha256(plaintextKey);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

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
      transaction: {
        userId: input.userId,
        transactionType: LicenseTransactionTypeEnum.PURCHASE,
        subtotalAmount: subtotal,
        discountAmount: discountAmount,
        discountPercentage: discountPercentage,
        appliedDiscountRuleId,
        totalAmount: totalAmount,
        currency,
        paymentStatus: PaymentStatusEnum.COMPLETED,
      },
      transactionItems: newLicenses.map(() => ({
        actionType: LicenseTransactionActionTypeEnum.PURCHASE,
        durationDays,
        baseUnitPrice: baseUnitPrice,
        discountPercentage: discountPercentage,
        unitPrice: unitPrice,
      })),
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

  async assignLicenseToBranch(
    input: AssignLicenseToBranchServiceInput,
  ): Promise<AssignLicenseToBranchServiceResult> {
    const orgId = input.effectiveTenant.organizationId;
    if (!orgId) {
      throw new AppError("Organization ID is required", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const license = await this.licenseRepository.findById({
      licenseId: input.licenseId,
      organizationId: orgId,
    });

    if (!license) {
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (license.branchId) {
      throw new AppError("License is already assigned to a branch", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const updated = await this.licenseRepository.update({
      licenseId: license.id,
      data: {
        branchId: input.branchId,
        updatedBy: input.userId,
      },
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
      throw new AppError("Organization ID is required", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const license = await this.licenseRepository.findById({
      licenseId: input.licenseId,
      organizationId: orgId,
    });

    if (!license) {
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (license.deviceId) {
      throw new AppError("License is already assigned to a device", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const updated = await this.licenseRepository.update({
      licenseId: license.id,
      data: {
        deviceId: input.deviceId,
        status: LicenseStatusEnum.ACTIVE,
        activatedAt: new Date(),
        updatedBy: input.userId,
      },
    });

    const { createdBy, updatedBy, ...rest } = updated;
    rest.licenseKey = decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY);

    return {
      license: rest,
    };
  }

  async getLicensePricingPlans(
    input: GetLicensePricingPlansServiceInput,
  ): Promise<GetLicensePricingPlansServiceResult> {
    const plans = await this.licenseRepository.getLicensePricingPlans({
      id: input.id,
    });
    return { plans };
  }

  async getDiscountRules(
    input: GetDiscountRulesServiceInput,
  ): Promise<GetDiscountRulesServiceResult> {
    const rules = await this.licenseRepository.findActiveDiscountRules({
      targetEntity: input.targetEntity,
    });
    return { rules };
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
