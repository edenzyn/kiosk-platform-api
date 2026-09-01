import dayjs from "dayjs";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountTypeEnum } from "../../../shared/enums/license/license-discount-type.enum";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../../shared/enums/license/license-transaction-action-type.enum";
import { PaymentProviderEnum } from "../../../shared/enums/license/payment-provider.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  decryptData,
  encryptData,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import { generatePrefixedId } from "../../../shared/utils/core/id.helper";
import { logger } from "../../../shared/utils/core/logger";
import { convertCurrencyAmount } from "../../../shared/utils/finance/convert-currency.helper";
import { calculateLicensePurchasePricing } from "../../../shared/utils/license/calculate-license-purchase-pricing.helper";
import { generateReadableLicenseKey } from "../../../shared/utils/license/generate-readable-license-key.helper";
import type { FinanceService } from "../../finance/finance.service";
import type { UserRepository } from "../../user/user.repository";
import type {
  CancelLicensePurchaseServiceInput,
  ExtendLicenseServiceResult,
  GetLicenseExtendInfoServiceInput,
  GetLicenseExtendInfoServiceResult,
  GetLicenseTransactionItemsForResellerServiceInput,
  GetLicenseTransactionItemsForResellerServiceResult,
  GetLicenseTransactionItemsServiceInput,
  GetLicenseTransactionItemsServiceResult,
  GetLicenseTransactionsForResellerServiceInput,
  GetLicenseTransactionsForResellerServiceResult,
  GetLicenseTransactionsServiceInput,
  GetLicenseTransactionsServiceResult,
  InitiateLicenseExtendServiceInput,
  InitiateLicenseExtendServiceResult,
  InitiateLicensePurchaseAsResellerServiceInput,
  InitiateLicensePurchaseAsResellerServiceResult,
  InitiateLicensePurchaseServiceInput,
  InitiateLicensePurchaseServiceResult,
  PurchaseLicenseAsResellerServiceInput,
  PurchaseLicenseAsResellerServiceResult,
  PurchaseLicenseServiceInput,
  PurchaseLicenseServiceResult,
  ResolvedPurchasePricing,
  VerifyLicenseExtendServiceInput,
} from "../license.types";
import type { LicenseDiscountRepository } from "../repositories/license-discount.repository";
import type { LicensePricingRepository } from "../repositories/license-pricing.repository";
import type { LicenseRedemptionRepository } from "../repositories/license-redemption.repository";
import type { LicenseTransactionRepository } from "../repositories/license-transaction.repository";
import type { LicenseRepository } from "../repositories/license.repository";
import type { LicenseEntity } from "../schemas/license.schema";

export class LicenseTransactionService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly licensePricingRepository: LicensePricingRepository,
    private readonly licenseDiscountRepository: LicenseDiscountRepository,
    private readonly licenseRedemptionRepository: LicenseRedemptionRepository,
    private readonly userRepository: UserRepository,
    private readonly financeService: FinanceService,
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

  private async _resolveDiscountRule(params: {
    discountRuleId: string;
    discountTargetEntity: number;
    quantity: number;
    pricingPlanId: string;
    resellerId?: string;
  }): Promise<{
    discountValue: number;
    discountType: number;
    ruleId: string;
    currency: string | null;
  }> {
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
      const targetsMap =
        await this.licenseDiscountRepository.findDiscountRuleTargets({
          ruleIds: [rule.id],
          targetEntity:
            LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL,
        });
      isApplicable = (targetsMap.get(rule.id) ?? []).some(
        (target) => target.id === params.resellerId,
      );
    } else if (
      rule.targetEntity ===
        LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL &&
      inQuantityRange
    ) {
      const targetsMap =
        await this.licenseDiscountRepository.findDiscountRuleTargets({
          ruleIds: [rule.id],
          targetEntity:
            LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL,
        });
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
      currency: rule.currency,
    };
  }

  private async _resolvePurchasePricing(params: {
    quantity: number;
    pricingPlanId: string;
    resellerId?: string;
    discountTargetEntity: number;
    discountRuleId?: string;
  }): Promise<ResolvedPurchasePricing> {
    const plans = await this.licensePricingRepository.findPricingPlans({
      id: params.pricingPlanId,
      isActive: true,
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
        quantity: params.quantity,
        pricingPlanId: params.pricingPlanId,
        resellerId: params.resellerId,
      });
      discountType = resolved.discountType;
      appliedDiscountRuleId = resolved.ruleId;

      if (resolved.discountType === LicenseDiscountTypeEnum.FLAT) {
        if (!resolved.currency) {
          throw new AppError(
            "Selected discount is no longer valid. Please review and try again.",
            { statusCode: HttpStatusCodes.BAD_REQUEST },
          );
        }

        const convertedFlatValue =
          resolved.currency === currency
            ? resolved.discountValue
            : await this.financeService.convertAmountToTargetCurrency({
                amount: resolved.discountValue,
                sourceCurrency: resolved.currency,
                targetCurrency: currency,
              });

        if (convertedFlatValue === null) {
          throw new AppError(
            "Could not apply discount: currency conversion is unavailable right now. Please try again shortly.",
            { statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE },
          );
        }

        discountValue = convertedFlatValue;
      } else {
        discountValue = resolved.discountValue;
      }
    }

    const pricing = calculateLicensePurchasePricing(
      basePrice,
      params.quantity,
      discountValue,
      discountType,
    );

    return {
      selectedPlan,
      durationDays,
      currency,
      appliedDiscountRuleId,
      ...pricing,
    };
  }

  private async _convertPricingToUserCurrency(
    pricing: ResolvedPurchasePricing,
    userId: string,
  ): Promise<ResolvedPurchasePricing> {
    const settings = await this.userRepository.getOrCreateSettings(userId);
    const targetCurrency = settings.currencyCode;

    if (targetCurrency === pricing.currency) {
      return pricing;
    }

    const exchangeRates = await this.financeService
      .getLatestRates()
      .catch(() => null);

    if (!exchangeRates) {
      logger.warn(
        `[LicenseTransactionService] Exchange rates unavailable; charging in ${pricing.currency} instead of ${targetCurrency}`,
      );
      return pricing;
    }

    const convert = (amount: string): string | null => {
      const converted = convertCurrencyAmount({
        amount: Number(amount),
        sourceCurrency: pricing.currency,
        targetCurrency,
        exchangeRates,
      });
      return converted === null ? null : converted.toFixed(2);
    };

    const convertedSubtotal = convert(pricing.subtotal);
    const convertedDiscountAmount = convert(pricing.discountAmount);
    const convertedTotalAmount = convert(pricing.totalAmount);
    const convertedUnitPrice = convert(pricing.unitPrice);
    const convertedBaseUnitPrice = convert(pricing.baseUnitPrice);

    if (
      convertedSubtotal === null ||
      convertedDiscountAmount === null ||
      convertedTotalAmount === null ||
      convertedUnitPrice === null ||
      convertedBaseUnitPrice === null
    ) {
      logger.warn(
        `[LicenseTransactionService] Could not convert pricing from ${pricing.currency} to ${targetCurrency}; charging in ${pricing.currency}`,
      );
      return pricing;
    }

    return {
      ...pricing,
      currency: targetCurrency,
      subtotal: convertedSubtotal,
      discountAmount: convertedDiscountAmount,
      totalAmount: convertedTotalAmount,
      unitPrice: convertedUnitPrice,
      baseUnitPrice: convertedBaseUnitPrice,
    };
  }

  private async _createPendingPurchaseOrder(params: {
    quantity: number;
    pricingPlanId: string;
    discountRuleId?: string;
    discountTargetEntity: number;
    resellerId?: string;
    ownerId: string;
    organizationId?: string | null;
    branchId?: string | null;
  }): Promise<InitiateLicensePurchaseServiceResult> {
    const basePricing = await this._resolvePurchasePricing({
      quantity: params.quantity,
      pricingPlanId: params.pricingPlanId,
      resellerId: params.resellerId,
      discountTargetEntity: params.discountTargetEntity,
      discountRuleId: params.discountRuleId,
    });

    const pricing = await this._convertPricingToUserCurrency(
      basePricing,
      params.ownerId,
    );

    const order = await this.financeService.createRazorpayOrder({
      amount: Number(pricing.totalAmount),
      currency: pricing.currency,
      receipt: generatePrefixedId("rec_lic_"),
      notes: {
        ownerId: params.ownerId,
        pricingPlanId: params.pricingPlanId,
        quantity: String(params.quantity),
      },
    });

    await this.licenseTransactionRepository.createPendingTransaction({
      userId: params.ownerId,
      organizationId: params.organizationId ?? null,
      branchId: params.branchId ?? null,
      subtotalAmount: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discountPercentage: pricing.discountPercentage,
      appliedDiscountRuleId: pricing.appliedDiscountRuleId,
      totalAmount: pricing.totalAmount,
      currency: pricing.currency,
      paymentStatus: PaymentStatusEnum.PENDING,
      paymentProvider: PaymentProviderEnum.RAZORPAY,
      paymentProviderOrderId: order.orderId,
      intentPayload: {
        quantity: params.quantity,
        pricingPlanId: params.pricingPlanId,
        discountRuleId: params.discountRuleId,
        razorpayOrder: order,
      },
      items: Array.from({ length: params.quantity }, () => ({
        pricingPlanId: pricing.selectedPlan.id,
        planName: pricing.selectedPlan.name,
        actionType: LicenseTransactionActionTypeEnum.PURCHASE,
        durationDays: pricing.durationDays,
        baseUnitPrice: pricing.baseUnitPrice,
        discountPercentage: pricing.discountPercentage,
        unitPrice: pricing.unitPrice,
      })),
    });

    return {
      razorpayOrderId: order.orderId,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      subtotalAmount: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
    };
  }

  private async _finalizeLicensePurchase(params: {
    pricing: ResolvedPurchasePricing;
    quantity: number;
    organizationId: string | null;
    branchId: string | null;
    ownerId: string;
    resellerId?: string;
    historyTargetEntityType?: LicenseHistoryTargetEntityTypeEnum;
    razorpayOrderId: string;
    razorpayPaymentId: string;
  }): Promise<PurchaseLicenseServiceResult> {
    const qty = params.quantity;

    const {
      selectedPlan,
      durationDays,
      discountPercentage,
      unitPrice,
      baseUnitPrice,
    } = params.pricing;

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
        deviceType: selectedPlan.deviceType,
        status: LicenseStatusEnum.AVAILABLE,
        expiresAt: null,
        createdBy: params.ownerId,
        updatedBy: params.ownerId,
      });
    }

    const created =
      await this.licenseTransactionRepository.finalizeLicensePurchase({
        paymentProviderOrderId: params.razorpayOrderId,
        userId: params.ownerId,
        paymentReference: params.razorpayPaymentId,
        currentPaymentStatus: PaymentStatusEnum.PENDING,
        newPaymentStatus: PaymentStatusEnum.COMPLETED,
        resellerId: params.resellerId,
        historyTargetEntityType: params.historyTargetEntityType,
        licenses: newLicenses,
        transactionItems: newLicenses.map(() => ({
          pricingPlanId: selectedPlan.id,
          planName: selectedPlan.name,
          actionType: LicenseTransactionActionTypeEnum.PURCHASE,
          durationDays,
          baseUnitPrice: baseUnitPrice,
          discountPercentage: discountPercentage,
          unitPrice: unitPrice,
        })),
      });

    if (!created) {
      throw new AppError(
        "This purchase order was not found or has already been processed",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        },
      );
    }

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

  private async _verifyAndFinalizePurchase(params: {
    quantity: number;
    pricingPlanId: string;
    discountRuleId?: string;
    discountTargetEntity: number;
    resellerId?: string;
    ownerId: string;
    organizationId: string | null;
    branchId: string | null;
    historyTargetEntityType?: LicenseHistoryTargetEntityTypeEnum;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<PurchaseLicenseServiceResult> {
    const basePricing = await this._resolvePurchasePricing({
      quantity: params.quantity,
      pricingPlanId: params.pricingPlanId,
      resellerId: params.resellerId,
      discountTargetEntity: params.discountTargetEntity,
      discountRuleId: params.discountRuleId,
    });

    const pricing = await this._convertPricingToUserCurrency(
      basePricing,
      params.ownerId,
    );

    await this.financeService.verifyRazorpayPayment({
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.razorpaySignature,
      expectedAmount: pricing.totalAmount,
      expectedCurrency: pricing.currency,
    });

    return this._finalizeLicensePurchase({
      pricing,
      quantity: params.quantity,
      organizationId: params.organizationId,
      branchId: params.branchId,
      ownerId: params.ownerId,
      resellerId: params.resellerId,
      historyTargetEntityType: params.historyTargetEntityType,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
    });
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async initiateLicensePurchase(
    input: InitiateLicensePurchaseServiceInput,
  ): Promise<InitiateLicensePurchaseServiceResult> {
    return this._createPendingPurchaseOrder({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity:
        LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      ownerId: input.userId,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || null,
    });
  }

  async verifyLicensePurchase(
    input: PurchaseLicenseServiceInput,
  ): Promise<PurchaseLicenseServiceResult> {
    return this._verifyAndFinalizePurchase({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity:
        LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      ownerId: input.userId,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || null,
      razorpayOrderId: input.dto.razorpayOrderId,
      razorpayPaymentId: input.dto.razorpayPaymentId,
      razorpaySignature: input.dto.razorpaySignature,
    });
  }

  async cancelLicensePurchase(
    input: CancelLicensePurchaseServiceInput,
  ): Promise<void> {
    await this.licenseTransactionRepository.cancelPendingTransaction({
      paymentProviderOrderId: input.razorpayOrderId,
      userId: input.userId,
      currentPaymentStatus: PaymentStatusEnum.PENDING,
      newPaymentStatus: PaymentStatusEnum.CANCELLED,
      failureReason: input.reason ?? "Payment was cancelled before completion",
    });
  }

  private async _resolveLicenseExtendPricing(
    licenseId: string,
    userId: string,
    licenseDeviceType: DeviceTypeEnum,
    pricingPlanId?: string,
  ): Promise<{
    price: number;
    currency: string;
    durationDays: number;
    planLabel: string;
    resolvedPricingPlanId: string | null;
  }> {
    const lockedPricing =
      await this.licenseRedemptionRepository.findRedemptionPricingForLicense(
        licenseId,
      );

    let resolved: {
      price: number;
      currency: string;
      durationDays: number;
      planLabel: string;
      resolvedPricingPlanId: string | null;
    };

    if (lockedPricing) {
      resolved = {
        price: Number(lockedPricing.soldPrice || lockedPricing.basePrice),
        currency: lockedPricing.soldPrice
          ? (lockedPricing.soldPriceCurrency ?? lockedPricing.basePriceCurrency)
          : lockedPricing.basePriceCurrency,
        durationDays: lockedPricing.durationDays,
        planLabel: lockedPricing.planName || "Redeemed plan",
        resolvedPricingPlanId: lockedPricing.pricingId,
      };
    } else {
      if (!pricingPlanId) {
        throw new AppError("Pricing plan is required", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }

      const pricingPlans = await this.licensePricingRepository.findPricingPlans(
        {
          id: pricingPlanId,
          isActive: true,
        },
      );
      const plan = pricingPlans[0];
      if (!plan) {
        throw new AppError("Pricing plan not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }

      if (plan.deviceType !== licenseDeviceType) {
        throw new AppError(
          "This pricing plan is for a different device type and cannot be used to extend this license.",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }

      resolved = {
        price: Number(plan.price),
        currency: plan.currency,
        durationDays: plan.durationDays,
        planLabel: plan.name,
        resolvedPricingPlanId: plan.id,
      };
    }

    const settings = await this.userRepository.getOrCreateSettings(userId);
    const targetCurrency = settings.currencyCode;

    const convertedAmount =
      await this.financeService.convertAmountToTargetCurrency({
        amount: resolved.price,
        sourceCurrency: resolved.currency,
        targetCurrency,
      });

    if (convertedAmount === null) {
      logger.warn(
        `[LicenseTransactionService] Could not convert amount from ${resolved.currency} to ${targetCurrency}; charging in ${resolved.currency}`,
      );
      return resolved;
    }

    return {
      ...resolved,
      price: Number(convertedAmount.toFixed(2)),
      currency: targetCurrency,
    };
  }

  private _computeExtendedExpiry(
    license: LicenseEntity,
    durationDays: number,
  ): { newExpiresAt: Date; newStatus: number } {
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
    const newStatus = license.deviceId
      ? LicenseStatusEnum.ACTIVE
      : LicenseStatusEnum.AVAILABLE;

    return { newExpiresAt, newStatus };
  }

  async initiateLicenseExtend(
    input: InitiateLicenseExtendServiceInput,
  ): Promise<InitiateLicenseExtendServiceResult> {
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

    const { price, currency, durationDays } =
      await this._resolveLicenseExtendPricing(
        license.id,
        input.userId,
        license.deviceType,
        input.dto.pricingPlanId,
      );

    const { subtotal, discountAmount, totalAmount } =
      calculateLicensePurchasePricing(price, 1, 0);

    const order = await this.financeService.createRazorpayOrder({
      amount: Number(totalAmount),
      currency,
      receipt: generatePrefixedId("rec_lic_"),
      notes: {
        licenseId: license.id,
        userId: input.userId,
        pricingPlanId: input.dto.pricingPlanId ?? "",
      },
    });

    await this.licenseTransactionRepository.createPendingTransaction({
      userId: input.userId,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || license.branchId || null,
      subtotalAmount: subtotal,
      discountAmount,
      discountPercentage: "0",
      appliedDiscountRuleId: null,
      totalAmount,
      currency,
      paymentStatus: PaymentStatusEnum.PENDING,
      paymentProvider: PaymentProviderEnum.RAZORPAY,
      paymentProviderOrderId: order.orderId,
      intentPayload: {
        licenseId: license.id,
        pricingPlanId: input.dto.pricingPlanId ?? null,
        durationDays,
        razorpayOrder: order,
      },
    });

    return {
      razorpayOrderId: order.orderId,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      subtotalAmount: subtotal,
      discountAmount,
      totalAmount,
    };
  }

  async verifyLicenseExtend(
    input: VerifyLicenseExtendServiceInput,
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

    const { price, currency, durationDays, planLabel, resolvedPricingPlanId } =
      await this._resolveLicenseExtendPricing(
        license.id,
        input.userId,
        license.deviceType,
        input.dto.pricingPlanId,
      );

    const { discountPercentage, totalAmount, unitPrice, baseUnitPrice } =
      calculateLicensePurchasePricing(price, 1, 0);

    await this.financeService.verifyRazorpayPayment({
      razorpayOrderId: input.dto.razorpayOrderId,
      razorpayPaymentId: input.dto.razorpayPaymentId,
      razorpaySignature: input.dto.razorpaySignature,
      expectedAmount: totalAmount,
      expectedCurrency: currency,
    });

    const { newExpiresAt, newStatus } = this._computeExtendedExpiry(
      license,
      durationDays,
    );

    const updated =
      await this.licenseTransactionRepository.finalizeLicenseExtend({
        licenseId: license.id,
        paymentProviderOrderId: input.dto.razorpayOrderId,
        userId: input.userId,
        paymentReference: input.dto.razorpayPaymentId,
        currentPaymentStatus: PaymentStatusEnum.PENDING,
        newPaymentStatus: PaymentStatusEnum.COMPLETED,
        newExpiresAt,
        newStatus,
        transactionItem: {
          pricingPlanId: resolvedPricingPlanId,
          planName: planLabel,
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

    if (!updated) {
      throw new AppError(
        "This extend order was not found or has already been processed",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        },
      );
    }

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
        basePriceCurrency: lockedPricing.basePriceCurrency,
        soldPrice: lockedPricing.soldPrice,
        soldPriceCurrency: lockedPricing.soldPriceCurrency,
        durationDays: lockedPricing.durationDays,
      },
    };
  }

  async getLicenseTransactions(
    input: GetLicenseTransactionsServiceInput,
  ): Promise<GetLicenseTransactionsServiceResult> {
    const organizationId = input.effectiveTenant.organizationId as string;
    const branchId = input.effectiveTenant.branchId || undefined;
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { transactions, total } =
      await this.licenseTransactionRepository.findTransactionsForOrganization({
        organizationId,
        branchId,
        page,
        limit,
      });

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLicenseTransactionItems(
    input: GetLicenseTransactionItemsServiceInput,
  ): Promise<GetLicenseTransactionItemsServiceResult> {
    const result =
      await this.licenseTransactionRepository.findTransactionWithItems({
        transactionId: input.transactionId,
        organizationId: input.effectiveTenant.organizationId as string,
        branchId: input.effectiveTenant.branchId || undefined,
      });

    if (!result) {
      throw new AppError("Transaction not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return {
      transaction: result.transaction,
      items: result.items.map((item) => ({
        ...item,
        licenseKey: item.licenseKey
          ? decryptData(item.licenseKey, env.LICENSE_ENCRYPTION_KEY)
          : null,
      })),
    };
  }

  // ========================================
  // ? RESELLER CLIENT SERVICES
  // ========================================
  async initiateLicensePurchaseAsReseller(
    input: InitiateLicensePurchaseAsResellerServiceInput,
  ): Promise<InitiateLicensePurchaseAsResellerServiceResult> {
    return this._createPendingPurchaseOrder({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
      resellerId: input.resellerId,
      ownerId: input.resellerId,
    });
  }

  async verifyLicensePurchaseAsReseller(
    input: PurchaseLicenseAsResellerServiceInput,
  ): Promise<PurchaseLicenseAsResellerServiceResult> {
    return this._verifyAndFinalizePurchase({
      quantity: input.dto.quantity,
      pricingPlanId: input.dto.pricingPlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
      resellerId: input.resellerId,
      ownerId: input.resellerId,
      organizationId: null,
      branchId: null,
      historyTargetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
      razorpayOrderId: input.dto.razorpayOrderId,
      razorpayPaymentId: input.dto.razorpayPaymentId,
      razorpaySignature: input.dto.razorpaySignature,
    });
  }

  async getLicenseTransactionsForReseller(
    input: GetLicenseTransactionsForResellerServiceInput,
  ): Promise<GetLicenseTransactionsForResellerServiceResult> {
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { transactions, total } =
      await this.licenseTransactionRepository.findTransactionsForReseller({
        resellerId: input.resellerId,
        page,
        limit,
      });

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLicenseTransactionItemsForReseller(
    input: GetLicenseTransactionItemsForResellerServiceInput,
  ): Promise<GetLicenseTransactionItemsForResellerServiceResult> {
    const result =
      await this.licenseTransactionRepository.findTransactionWithItems({
        transactionId: input.transactionId,
        resellerId: input.resellerId,
      });

    if (!result) {
      throw new AppError("Transaction not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return {
      transaction: result.transaction,
      items: result.items.map((item) => ({
        ...item,
        licenseKey: item.licenseKey
          ? decryptData(item.licenseKey, env.LICENSE_ENCRYPTION_KEY)
          : null,
      })),
    };
  }
}
