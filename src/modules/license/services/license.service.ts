import dayjs from "dayjs";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountTypeEnum } from "../../../shared/enums/license/license-discount-type.enum";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../../shared/enums/license/license-transaction-action-type.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  decryptData,
  encryptData,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import { calculateLicensePurchasePricing } from "../../../shared/utils/license/calculate-license-purchase-pricing.helper";
import { generateReadableLicenseKey } from "../../../shared/utils/license/generate-readable-license-key.helper";
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
  ExtendLicenseServiceInput,
  ExtendLicenseServiceResult,
  GetLicenseDetailsForResellerServiceInput,
  GetLicenseDetailsForResellerServiceResult,
  GetLicenseDetailsServiceInput,
  GetLicenseDetailsServiceResult,
  GetLicenseExtendInfoServiceInput,
  GetLicenseExtendInfoServiceResult,
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
  PurchaseLicenseAsResellerServiceInput,
  PurchaseLicenseAsResellerServiceResult,
  PurchaseLicenseServiceInput,
  PurchaseLicenseServiceResult,
} from "../license.types";
import type { LicenseDiscountRepository } from "../repositories/license-discount.repository";
import type { LicensePricingRepository } from "../repositories/license-pricing.repository";
import type { LicenseRedemptionRepository } from "../repositories/license-redemption.repository";
import type { LicenseRepository } from "../repositories/license.repository";
import type { LicenseEntity } from "../schemas/license.schema";

export class LicenseService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licensePricingRepository: LicensePricingRepository,
    private readonly licenseDiscountRepository: LicenseDiscountRepository,
    private readonly licenseRedemptionRepository: LicenseRedemptionRepository,
  ) {}

  private async _checkActiveLicenseExists(
    deviceId: string,
    excludeLicenseId?: string,
  ): Promise<void> {
    const activeLicense = await this.licenseRepository.findOneActiveByDeviceId({
      deviceId,
    });
    if (activeLicense && activeLicense.id !== excludeLicenseId) {
      throw new AppError("Device already has an active license assigned", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }
  }

  // Re-validates a client-selected discount rule against the actual purchase
  // (quantity, plan, reseller) rather than trusting the client's own math,
  // since the client only ever sends a rule id, never a discount amount.
  private async _resolveDiscountRule(params: {
    discountRuleId: string;
    discountTargetEntity: number;
    quantity: number;
    pricingPlanId: string;
    resellerId?: string;
  }): Promise<{ discountValue: number; discountType: number; ruleId: string }> {
    const rule = await this.licenseDiscountRepository.findDiscountRule({
      ruleId: params.discountRuleId,
    });

    const invalidDiscountError = () =>
      new AppError(
        "Selected discount is no longer valid. Please review and try again.",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );

    const now = new Date();
    const isWithinActiveWindow =
      !!rule &&
      rule.isActive &&
      (!rule.startsAt || new Date(rule.startsAt) <= now) &&
      (!rule.endsAt || new Date(rule.endsAt) >= now);

    if (!rule || !isWithinActiveWindow) {
      throw invalidDiscountError();
    }

    const inQuantityRange =
      params.quantity >= rule.minQuantity &&
      (rule.maxQuantity === null || params.quantity <= rule.maxQuantity);

    let isApplicable = false;

    if (rule.targetEntity === params.discountTargetEntity) {
      isApplicable = inQuantityRange;
    } else if (
      rule.targetEntity ===
        LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL &&
      params.resellerId &&
      inQuantityRange
    ) {
      const targetsMap = await this.licenseDiscountRepository.findDiscountRuleTargets(
        {
          ruleIds: [rule.id],
          targetEntity:
            LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL,
        },
      );
      isApplicable = (targetsMap.get(rule.id) ?? []).some(
        (target) => target.id === params.resellerId,
      );
    } else if (
      rule.targetEntity ===
      LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL
    ) {
      const targetsMap = await this.licenseDiscountRepository.findDiscountRuleTargets(
        {
          ruleIds: [rule.id],
          targetEntity:
            LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL,
        },
      );
      isApplicable = (targetsMap.get(rule.id) ?? []).some(
        (target) => target.id === params.pricingPlanId,
      );
    }

    if (!isApplicable) {
      throw invalidDiscountError();
    }

    return {
      discountValue: Number(rule.discountValue),
      discountType: rule.discountType,
      ruleId: rule.id,
    };
  }

  private async _purchaseLicenses(params: {
    quantity: number;
    pricingPlanId: string;
    organizationId: string | null;
    branchId: string | null;
    userId: string;
    resellerId?: string;
    discountTargetEntity: number;
    discountRuleId?: string;
    historyTargetEntityType?: LicenseHistoryTargetEntityTypeEnum;
  }): Promise<PurchaseLicenseServiceResult> {
    const qty = params.quantity;

    const plans = await this.licensePricingRepository.findPricingPlans({
      id: params.pricingPlanId,
    });
    const selectedPlan = plans[0];

    if (!selectedPlan) {
      throw new AppError("Selected pricing plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const durationDays = selectedPlan.durationDays;
    const basePrice = Number(selectedPlan.price);
    const currency = selectedPlan.currency;

    let discountValue = 0;
    let discountType = LicenseDiscountTypeEnum.PERCENTAGE;
    let appliedDiscountRuleId: string | null = null;

    if (params.discountRuleId) {
      const resolved = await this._resolveDiscountRule({
        discountRuleId: params.discountRuleId,
        discountTargetEntity: params.discountTargetEntity,
        quantity: qty,
        pricingPlanId: params.pricingPlanId,
        resellerId: params.resellerId,
      });
      discountValue = resolved.discountValue;
      discountType = resolved.discountType;
      appliedDiscountRuleId = resolved.ruleId;
    }

    const {
      subtotal,
      discountPercentage,
      discountAmount,
      totalAmount,
      unitPrice,
      baseUnitPrice,
    } = calculateLicensePurchasePricing(basePrice, qty, discountValue, discountType);

    const newLicenses = [];
    for (let i = 0; i < qty; i++) {
      const plaintextKey = generateReadableLicenseKey();
      const encryptedKey = encryptData(
        plaintextKey,
        env.LICENSE_ENCRYPTION_KEY,
      );
      const keyHash = hashSha256(plaintextKey);

      newLicenses.push({
        licenseKey: encryptedKey,
        licenseKeyHash: keyHash,
        organizationId: params.organizationId,
        branchId: params.branchId,
        status: LicenseStatusEnum.AVAILABLE,
        expiresAt: null,
        createdBy: params.userId,
        updatedBy: params.userId,
      });
    }

    const created = await this.licenseRepository.createLicenses({
      licenses: newLicenses,
      resellerId: params.resellerId,
      historyTargetEntityType: params.historyTargetEntityType,
      transaction: {
        userId: params.userId,
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
    return this._purchaseLicenses({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || null,
      userId: input.userId,
      discountTargetEntity:
        LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      discountRuleId: input.dto.discountRuleId,
    });
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

    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
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
      throw new AppError("Organization ID is required", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
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

    await this._checkActiveLicenseExists(input.deviceId);

    const purchaseItem = await this.licenseRepository.findOneLatestPurchaseItem(
      license.id,
    );
    const durationDays = purchaseItem?.durationDays as number;
    const expiresAt = dayjs().add(durationDays, "day").toDate();

    const updated = await this.licenseRepository.update({
      licenseId: license.id,
      data: {
        deviceId: input.deviceId,
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

  async extendLicense(
    input: ExtendLicenseServiceInput,
  ): Promise<ExtendLicenseServiceResult> {
    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
      organizationId: input.effectiveTenant.organizationId as string,
    });
    if (!license) {
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (license.deviceId) {
      await this._checkActiveLicenseExists(license.deviceId, license.id);
    }

    const lockedPricing =
      await this.licenseRedemptionRepository.findRedemptionPricingForLicense(
        license.id,
      );

    let durationDays: number;
    let basePrice: string;
    let currency: string;
    let planLabel: string;

    if (lockedPricing) {
      durationDays = lockedPricing.durationDays;
      basePrice = lockedPricing.soldPrice || lockedPricing.basePrice;
      currency = lockedPricing.currency;
      planLabel = lockedPricing.planName || "redeemed plan";
    } else {
      if (!input.dto.pricingPlanId) {
        throw new AppError("Pricing plan ID is required", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }

      const pricingPlans = await this.licensePricingRepository.findPricingPlans({
        id: input.dto.pricingPlanId,
      });
      const plan = pricingPlans[0];
      if (!plan) {
        throw new AppError("Pricing plan not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }

      durationDays = plan.durationDays;
      basePrice = plan.price;
      currency = plan.currency;
      planLabel = plan.name;
    }

    const {
      subtotal,
      discountPercentage,
      discountAmount,
      totalAmount,
      unitPrice,
      baseUnitPrice,
    } = calculateLicensePurchasePricing(Number(basePrice), 1, 0);

    const now = new Date();
    const currentExpiresAt = license.expiresAt
      ? new Date(license.expiresAt)
      : null;
    let baseDate = now;
    if (
      currentExpiresAt &&
      currentExpiresAt > now &&
      (license.status === LicenseStatusEnum.ACTIVE ||
        license.status === LicenseStatusEnum.GRACE_PERIOD)
    ) {
      baseDate = currentExpiresAt;
    }

    const newExpiresAt = dayjs(baseDate).add(durationDays, "day").toDate();

    let newStatus = LicenseStatusEnum.ACTIVE;
    if (!license.deviceId) {
      newStatus = LicenseStatusEnum.AVAILABLE;
    }

    const updated = await this.licenseRepository.extendLicense({
      licenseId: license.id,
      newExpiresAt,
      newStatus,
      transaction: {
        userId: input.userId,
        subtotalAmount: subtotal,
        discountAmount: discountAmount,
        discountPercentage: discountPercentage,
        appliedDiscountRuleId: null,
        totalAmount: totalAmount,
        currency,
        paymentStatus: PaymentStatusEnum.COMPLETED,
      },
      transactionItem: {
        actionType: LicenseTransactionActionTypeEnum.RENEWAL,
        durationDays,
        baseUnitPrice,
        discountPercentage,
        unitPrice,
      },
      historyEvent: {
        eventType: LicenseHistoryEventTypeEnum.EXTEND,
        targetEntityType: LicenseHistoryTargetEntityTypeEnum.NORMAL,
        previousStatus: license.status,
        previousExpiresAt: license.expiresAt,
        remarks: `License extended by ${durationDays} days via plan: ${planLabel}`,
      },
    });

    const { createdBy, updatedBy, ...rest } = updated;
    return {
      license: {
        ...rest,
        licenseKey: decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY),
      },
    };
  }

  async getLicenseExtendInfo(
    input: GetLicenseExtendInfoServiceInput,
  ): Promise<GetLicenseExtendInfoServiceResult> {
    const license = await this.licenseRepository.findOne({
      id: input.licenseId,
      organizationId: input.effectiveTenant.organizationId as string,
    });
    if (!license) {
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const lockedPricing =
      await this.licenseRedemptionRepository.findRedemptionPricingForLicense(
        license.id,
      );

    if (!lockedPricing) {
      return { isRedeemed: false, lockedPricing: null };
    }

    return {
      isRedeemed: true,
      lockedPricing: {
        planName: lockedPricing.planName,
        basePrice: lockedPricing.basePrice,
        soldPrice: lockedPricing.soldPrice,
        currency: lockedPricing.currency,
        durationDays: lockedPricing.durationDays,
      },
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
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
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
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (
      input.effectiveTenant.organizationId &&
      license.organizationId !== input.effectiveTenant.organizationId
    ) {
      throw new AppError("Access denied to license", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }

    const transactions = await this.licenseRepository.findLicenseTransactions({
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

  async purchaseLicenseAsReseller(
    input: PurchaseLicenseAsResellerServiceInput,
  ): Promise<PurchaseLicenseAsResellerServiceResult> {
    return this._purchaseLicenses({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      organizationId: null,
      branchId: null,
      userId: input.resellerId,
      resellerId: input.resellerId,
      discountTargetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
      historyTargetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
      discountRuleId: input.dto.discountRuleId,
    });
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
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }
  }

  async getLicenseHistoryForReseller(
    input: GetLicenseHistoryForResellerServiceInput,
  ): Promise<GetLicenseHistoryForResellerServiceResult> {
    await this._checkLicenseOwnedByReseller(input.licenseId, input.resellerId);

    const history = await this.licenseRepository.findHistory({
      licenseId: input.licenseId,
      targetEntityTypes: [
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
      throw new AppError("License not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const transactions = await this.licenseRepository.findLicenseTransactions({
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
        throw new AppError("License not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
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
      const {
        createdBy,
        updatedBy,
        licenseKey: _lk,
        licenseKeyHash: _lkh,
        ...rest
      } = activeLicense;
      return { license: rest };
    }

    const anyLicense = await this.licenseRepository.findOne({
      deviceId: input.deviceId,
    });
    if (anyLicense) {
      const { license: evaluatedLicense, gracePeriodExpiresAt } =
        await this._evaluateAndUpdateLicenseStatus(anyLicense);

      const {
        createdBy,
        updatedBy,
        licenseKey: _lk,
        licenseKeyHash: _lkh,
        ...rest
      } = evaluatedLicense;

      if (evaluatedLicense.status === LicenseStatusEnum.GRACE_PERIOD) {
        return {
          license: {
            ...rest,
            gracePeriodExpiresAt,
          },
        };
      }

      return { license: rest };
    }

    return { license: null };
  }

  async activateLicenseByKey(
    input: ActivateLicenseServiceInput,
  ): Promise<ActivateLicenseServiceResult> {
    const keyHash = hashSha256(input.dto.licenseKey);

    const license = await this.licenseRepository.findOne({
      licenseKeyHash: keyHash,
    });

    if (!license) {
      throw new AppError("Invalid license key. No such license found.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (license.status === LicenseStatusEnum.ACTIVE || license.deviceId) {
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

    const purchaseItem = await this.licenseRepository.findOneLatestPurchaseItem(
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
