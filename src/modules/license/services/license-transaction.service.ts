import dayjs from "dayjs";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountTypeEnum } from "../../../shared/enums/license/license-discount-type.enum";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionTypeEnum } from "../../../shared/enums/license/license-transaction-type.enum";
import { PaymentProviderEnum } from "../../../shared/enums/license/payment-provider.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  decryptData,
  encryptData,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import { generatePrefixedId } from "../../../shared/utils/core/id.helper";
import { calculateTaxBreakdown } from "../../../shared/utils/finance/calculate-tax-breakdown.helper";
import { calculateLicensePurchasePricing } from "../../../shared/utils/license/calculate-license-purchase-pricing.helper";
import { generateReadableLicenseKey } from "../../../shared/utils/license/generate-readable-license-key.helper";
import type { BranchRepository } from "../../branch/branch.repository";
import type { FinanceService } from "../../finance/finance.service";
import type { MarketRepository } from "../../market/market.repository";
import type { MarketService } from "../../market/market.service";
import type { BillingInfoDto } from "../dtos/purchase-license.dtos";
import type {
  CancelLicensePurchaseServiceInput,
  ExtendLicenseServiceResult,
  GetLicenseExtendInfoServiceInput,
  GetLicenseExtendInfoServiceResult,
  GetLicenseTransactionDetailsForResellerServiceInput,
  GetLicenseTransactionDetailsForResellerServiceResult,
  GetLicenseTransactionDetailsServiceInput,
  GetLicenseTransactionDetailsServiceResult,
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
  ResolvedPurchaseTax,
  VerifyLicenseExtendServiceInput,
} from "../license.types";
import type { LicenseDiscountRepository } from "../repositories/license-discount.repository";
import type { LicensePlanRepository } from "../repositories/license-plan.repository";
import type { LicenseRedemptionRepository } from "../repositories/license-redemption.repository";
import type { LicenseTransactionRepository } from "../repositories/license-transaction.repository";
import type { LicenseRepository } from "../repositories/license.repository";
import type { LicenseEntity } from "../schemas/license.schema";

export class LicenseTransactionService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly licensePlanRepository: LicensePlanRepository,
    private readonly licenseDiscountRepository: LicenseDiscountRepository,
    private readonly licenseRedemptionRepository: LicenseRedemptionRepository,
    private readonly financeService: FinanceService,
    private readonly branchRepository: BranchRepository,
    private readonly marketRepository: MarketRepository,
    private readonly marketService: MarketService,
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

  private async _resolveOrganizationPurchaseMarketId(params: {
    organizationId: string;
    branchId: string | null;
    dtoMarketId?: string;
  }): Promise<string> {
    if (params.branchId) {
      const branch = await this.branchRepository.findOne({
        id: params.branchId,
      });
      if (!branch) {
        throw new AppError("Branch not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }
      return branch.marketId;
    }

    if (!params.dtoMarketId) {
      throw new AppError(
        "Market is required for an organization-level purchase",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        },
      );
    }

    await this._validateOrganizationMarket(
      params.organizationId,
      params.dtoMarketId,
    );
    return params.dtoMarketId;
  }

  private async _validateOrganizationMarket(
    organizationId: string,
    marketId: string,
  ): Promise<void> {
    const isMapped = await this.marketRepository.isOrganizationMappedToMarket({
      organizationId,
      marketId,
    });
    if (!isMapped) {
      throw new AppError("This market is not available for your organization", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
  }

  private async _resolveResellerPurchaseMarketId(params: {
    resellerId: string;
    marketId: string;
  }): Promise<string> {
    const isMapped = await this.marketRepository.isResellerMappedToMarket({
      resellerId: params.resellerId,
      marketId: params.marketId,
    });
    if (!isMapped) {
      throw new AppError("This market is not available for you", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
    return params.marketId;
  }

  private async _validateBillingCountryMatchesMarket(
    billingCountry: string,
    marketId: string,
  ): Promise<void> {
    const market = await this.marketService.getMarketWithTax({ marketId });
    if (market.countryCode !== billingCountry) {
      throw new AppError(
        "Billing country must match the selected market's country",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.VALIDATION_ERROR,
        },
      );
    }
  }

  private async _resolveDiscountRule(params: {
    discountRuleId: string;
    discountTargetEntity: number;
    quantity: number;
    licensePlanId: string;
    resellerId?: string;
    marketId: string;
  }): Promise<{
    discountValue: number;
    discountType: number;
    ruleId: string;
    scopeType: number;
    marketId: string | null;
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

    if (rule.marketId && rule.marketId !== params.marketId) {
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
        (target) => target.id === params.licensePlanId,
      );
    }

    if (!isApplicable) {
      throw invalidDiscountError();
    }

    return {
      discountValue: Number(rule.discountValue),
      discountType: rule.discountType,
      ruleId: rule.id,
      scopeType: rule.scopeType,
      marketId: rule.marketId,
    };
  }

  private async _resolvePurchasePricing(params: {
    quantity: number;
    licensePlanId: string;
    resellerId?: string;
    discountTargetEntity: number;
    discountRuleId?: string;
    marketId: string;
    billingCountry?: string | null;
    billingState?: string | null;
  }): Promise<ResolvedPurchasePricing> {
    const plans = await this.licensePlanRepository.findLicensePlans({
      id: params.licensePlanId,
      isActive: true,
      marketId: params.marketId,
    });
    const selectedPlan = plans[0];

    if (!selectedPlan || selectedPlan.price === null) {
      throw new AppError(
        "Selected license plan is not available in this market",
        { statusCode: HttpStatusCodes.NOT_FOUND },
      );
    }

    const durationDays = selectedPlan.durationDays;
    const basePrice = Number(selectedPlan.price);
    const market = await this.marketService.getMarketWithTax({
      marketId: params.marketId,
    });

    let discountValue = 0;
    let discountType = LicenseDiscountTypeEnum.PERCENTAGE;
    let appliedDiscountRuleId: string | null = null;

    if (params.discountRuleId) {
      const resolved = await this._resolveDiscountRule({
        discountRuleId: params.discountRuleId,
        discountTargetEntity: params.discountTargetEntity,
        quantity: params.quantity,
        licensePlanId: params.licensePlanId,
        resellerId: params.resellerId,
        marketId: params.marketId,
      });
      discountType = resolved.discountType;
      appliedDiscountRuleId = resolved.ruleId;

      if (
        resolved.discountType === LicenseDiscountTypeEnum.FLAT &&
        resolved.marketId !== params.marketId
      ) {
        throw new AppError(
          "Selected discount is no longer valid. Please review and try again.",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }

      discountValue = resolved.discountValue;
    }

    const pricing = calculateLicensePurchasePricing(
      basePrice,
      params.quantity,
      discountValue,
      discountType,
    );

    const taxBreakdown = calculateTaxBreakdown(
      market.taxProfile,
      Number(pricing.totalAmount),
      params.billingCountry,
      params.billingState,
    );

    const tax = taxBreakdown
      ? {
          components: taxBreakdown.components.map((component) => ({
            name: component.name,
            rate: component.rate,
            amount: component.amount.toFixed(2),
            taxProfileId: component.taxProfileId,
            taxComponentId: component.taxComponentId,
          })),
          taxAmount: taxBreakdown.totalTax.toFixed(2),
          isInclusive: taxBreakdown.isInclusive,
        }
      : null;

    const chargeAmount = taxBreakdown
      ? taxBreakdown.grandTotal.toFixed(2)
      : pricing.totalAmount;

    const { totalAmount: amountBeforeTax, ...restPricing } = pricing;

    return {
      selectedPlan,
      durationDays,
      marketId: params.marketId,
      currencyCode: market.currencyCode,
      appliedDiscountRuleId,
      ...restPricing,
      amountBeforeTax,
      tax,
      chargeAmount,
    };
  }

  private async _createPendingPurchaseOrder(params: {
    quantity: number;
    licensePlanId: string;
    discountRuleId?: string;
    discountTargetEntity: number;
    resellerId?: string;
    ownerId: string;
    organizationId?: string | null;
    branchId?: string | null;
    marketId: string;
    transactionType: LicenseTransactionTypeEnum;
    billingInfo?: BillingInfoDto;
  }): Promise<InitiateLicensePurchaseServiceResult> {
    if (params.billingInfo) {
      await this._validateBillingCountryMatchesMarket(
        params.billingInfo.country,
        params.marketId,
      );
    }

    const pricing = await this._resolvePurchasePricing({
      quantity: params.quantity,
      licensePlanId: params.licensePlanId,
      resellerId: params.resellerId,
      discountTargetEntity: params.discountTargetEntity,
      discountRuleId: params.discountRuleId,
      marketId: params.marketId,
      billingCountry: params.billingInfo?.country,
      billingState: params.billingInfo?.state,
    });

    const order = await this.financeService.createRazorpayOrder({
      amount: Number(pricing.chargeAmount),
      currency: pricing.currencyCode,
      receipt: generatePrefixedId("rec_lic_"),
      notes: {
        ownerId: params.ownerId,
        licensePlanId: params.licensePlanId,
        quantity: String(params.quantity),
      },
    });

    await this.licenseTransactionRepository.createPendingTransaction({
      userId: params.ownerId,
      organizationId: params.organizationId ?? null,
      branchId: params.branchId ?? null,
      marketId: params.marketId,
      transactionType: params.transactionType,
      subtotalAmount: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discountType: pricing.discountType,
      discountValue: pricing.discountValue,
      appliedDiscountRuleId: pricing.appliedDiscountRuleId,
      amountBeforeTax: pricing.amountBeforeTax,
      taxAmount: pricing.tax?.taxAmount ?? "0",
      isTaxInclusive: pricing.tax?.isInclusive ?? false,
      totalAmount: pricing.chargeAmount,
      paymentStatus: PaymentStatusEnum.PENDING,
      paymentProvider: PaymentProviderEnum.RAZORPAY,
      paymentProviderOrderId: order.orderId,
      intentPayload: {
        quantity: params.quantity,
        licensePlanId: params.licensePlanId,
        discountRuleId: params.discountRuleId,
        razorpayOrder: order,
      },
      billingInfo: params.billingInfo,
      items: Array.from({ length: params.quantity }, () => ({
        planId: pricing.selectedPlan.id,
        planName: pricing.selectedPlan.name,
        transactionType: params.transactionType,
        durationDays: pricing.durationDays,
        baseUnitPrice: pricing.baseUnitPrice,
        discountAmount: (
          Number(pricing.discountAmount) / params.quantity
        ).toFixed(2),
        finalUnitPrice: pricing.unitPrice,
      })),
      taxes: pricing.tax?.components,
    });

    return {
      razorpayOrderId: order.orderId,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      subtotalAmount: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      amountBeforeTax: pricing.amountBeforeTax,
      taxAmount: pricing.tax?.taxAmount ?? "0.00",
      taxComponents: pricing.tax?.components ?? [],
      isTaxInclusive: pricing.tax?.isInclusive ?? false,
      grandTotal: pricing.chargeAmount,
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
    transactionType: LicenseTransactionTypeEnum;
  }): Promise<PurchaseLicenseServiceResult> {
    const qty = params.quantity;

    const {
      selectedPlan,
      durationDays,
      discountAmount,
      unitPrice,
      baseUnitPrice,
      marketId,
    } = params.pricing;

    const perUnitDiscountAmount = (Number(discountAmount) / qty).toFixed(2);

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
        marketId,
        currentPlanId: selectedPlan.id,
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
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          transactionType: params.transactionType,
          durationDays,
          baseUnitPrice: baseUnitPrice,
          discountAmount: perUnitDiscountAmount,
          finalUnitPrice: unitPrice,
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
    licensePlanId: string;
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
    marketId: string;
    transactionType: LicenseTransactionTypeEnum;
    billingInfo?: BillingInfoDto;
  }): Promise<PurchaseLicenseServiceResult> {
    if (params.billingInfo) {
      await this._validateBillingCountryMatchesMarket(
        params.billingInfo.country,
        params.marketId,
      );
    }

    const pricing = await this._resolvePurchasePricing({
      quantity: params.quantity,
      licensePlanId: params.licensePlanId,
      resellerId: params.resellerId,
      discountTargetEntity: params.discountTargetEntity,
      discountRuleId: params.discountRuleId,
      marketId: params.marketId,
      billingCountry: params.billingInfo?.country,
      billingState: params.billingInfo?.state,
    });

    await this.financeService.verifyRazorpayPayment({
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.razorpaySignature,
      expectedAmount: pricing.chargeAmount,
      expectedCurrency: pricing.currencyCode,
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
      transactionType: params.transactionType,
    });
  }

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async initiateLicensePurchase(
    input: InitiateLicensePurchaseServiceInput,
  ): Promise<InitiateLicensePurchaseServiceResult> {
    const organizationId = input.effectiveTenant.organizationId;
    const branchId = input.effectiveTenant.branchId || null;
    const marketId = await this._resolveOrganizationPurchaseMarketId({
      organizationId,
      branchId,
      dtoMarketId: input.dto.marketId,
    });

    return this._createPendingPurchaseOrder({
      quantity: input.dto.quantity,
      licensePlanId: input.dto.licensePlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity:
        LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      ownerId: input.userId,
      organizationId,
      branchId,
      marketId,
      transactionType: LicenseTransactionTypeEnum.ORGANIZATION_PURCHASE,
      billingInfo: input.dto.billingInfo,
    });
  }

  async verifyLicensePurchase(
    input: PurchaseLicenseServiceInput,
  ): Promise<PurchaseLicenseServiceResult> {
    const organizationId = input.effectiveTenant.organizationId;
    const branchId = input.effectiveTenant.branchId || null;
    const marketId = await this._resolveOrganizationPurchaseMarketId({
      organizationId,
      branchId,
      dtoMarketId: input.dto.marketId,
    });

    return this._verifyAndFinalizePurchase({
      quantity: input.dto.quantity,
      licensePlanId: input.dto.licensePlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity:
        LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
      ownerId: input.userId,
      organizationId,
      branchId,
      marketId,
      razorpayOrderId: input.dto.razorpayOrderId,
      razorpayPaymentId: input.dto.razorpayPaymentId,
      razorpaySignature: input.dto.razorpaySignature,
      transactionType: LicenseTransactionTypeEnum.ORGANIZATION_PURCHASE,
      billingInfo: input.dto.billingInfo,
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
    license: LicenseEntity,
    licensePlanId?: string,
    billingCountry?: string | null,
    billingState?: string | null,
  ): Promise<{
    price: number;
    currencyCode: string;
    durationDays: number;
    planLabel: string;
    resolvedPlanId: string | null;
    marketId: string;
    tax: ResolvedPurchaseTax | null;
    chargeAmount: string;
  }> {
    const lockedPricing =
      await this.licenseRedemptionRepository.findRedemptionPricingForLicense(
        license.id,
      );

    let resolved: {
      price: number;
      currencyCode: string;
      durationDays: number;
      planLabel: string;
      resolvedPlanId: string | null;
      marketId: string;
    };

    if (lockedPricing) {
      if (lockedPricing.lockedPrice === null) {
        throw new AppError(
          "This license's redemption sale price has not been verified yet. It cannot be extended until the reseller verifies the sold price.",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }

      const market = await this.marketService.getMarketWithTax({
        marketId: lockedPricing.marketId,
      });
      resolved = {
        price: Number(lockedPricing.lockedPrice),
        currencyCode: market.currencyCode,
        durationDays: lockedPricing.durationDays,
        planLabel: lockedPricing.lockedPlanName || "Redeemed plan",
        resolvedPlanId: lockedPricing.planId,
        marketId: lockedPricing.marketId,
      };
    } else {
      if (!licensePlanId) {
        throw new AppError("License plan is required", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }

      const licensePlans = await this.licensePlanRepository.findLicensePlans({
        id: licensePlanId,
        isActive: true,
        marketId: license.marketId,
      });
      const plan = licensePlans[0];
      if (!plan || plan.price === null) {
        throw new AppError("License plan not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }

      if (plan.deviceType !== license.deviceType) {
        throw new AppError(
          "This license plan is for a different device type and cannot be used to extend this license.",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }

      const market = await this.marketService.getMarketWithTax({
        marketId: license.marketId,
      });

      resolved = {
        price: Number(plan.price),
        currencyCode: market.currencyCode,
        durationDays: plan.durationDays,
        planLabel: plan.name,
        resolvedPlanId: plan.id,
        marketId: license.marketId,
      };
    }

    const market = await this.marketService.getMarketWithTax({
      marketId: resolved.marketId,
    });
    const taxBreakdown = calculateTaxBreakdown(
      market.taxProfile,
      resolved.price,
      billingCountry,
      billingState,
    );
    const tax = taxBreakdown
      ? {
          components: taxBreakdown.components.map((component) => ({
            name: component.name,
            rate: component.rate,
            amount: component.amount.toFixed(2),
            taxProfileId: component.taxProfileId,
            taxComponentId: component.taxComponentId,
          })),
          taxAmount: taxBreakdown.totalTax.toFixed(2),
          isInclusive: taxBreakdown.isInclusive,
        }
      : null;
    const chargeAmount = taxBreakdown
      ? taxBreakdown.grandTotal.toFixed(2)
      : resolved.price.toFixed(2);

    return { ...resolved, tax, chargeAmount };
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

    const { price, currencyCode, durationDays, marketId, tax, chargeAmount } =
      await this._resolveLicenseExtendPricing(
        license,
        input.dto.licensePlanId,
        input.dto.billingInfo.country,
        input.dto.billingInfo.state,
      );

    await this._validateBillingCountryMatchesMarket(
      input.dto.billingInfo.country,
      marketId,
    );

    const {
      subtotal,
      discountAmount,
      totalAmount: amountBeforeTax,
    } = calculateLicensePurchasePricing(price, 1, 0);

    const order = await this.financeService.createRazorpayOrder({
      amount: Number(chargeAmount),
      currency: currencyCode,
      receipt: generatePrefixedId("rec_lic_"),
      notes: {
        licenseId: license.id,
        userId: input.userId,
        licensePlanId: input.dto.licensePlanId ?? "",
      },
    });

    await this.licenseTransactionRepository.createPendingTransaction({
      userId: input.userId,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || license.branchId || null,
      marketId: license.marketId,
      transactionType: LicenseTransactionTypeEnum.RENEWAL,
      subtotalAmount: subtotal,
      discountAmount,
      discountType: null,
      discountValue: null,
      appliedDiscountRuleId: null,
      amountBeforeTax,
      taxAmount: tax?.taxAmount ?? "0",
      isTaxInclusive: tax?.isInclusive ?? false,
      totalAmount: chargeAmount,
      paymentStatus: PaymentStatusEnum.PENDING,
      paymentProvider: PaymentProviderEnum.RAZORPAY,
      paymentProviderOrderId: order.orderId,
      intentPayload: {
        licenseId: license.id,
        licensePlanId: input.dto.licensePlanId ?? null,
        durationDays,
        razorpayOrder: order,
      },
      billingInfo: input.dto.billingInfo,
      taxes: tax?.components,
    });

    return {
      razorpayOrderId: order.orderId,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      subtotalAmount: subtotal,
      discountAmount,
      amountBeforeTax,
      taxAmount: tax?.taxAmount ?? "0.00",
      taxComponents: tax?.components ?? [],
      isTaxInclusive: tax?.isInclusive ?? false,
      grandTotal: chargeAmount,
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

    const {
      price,
      currencyCode,
      durationDays,
      planLabel,
      resolvedPlanId,
      marketId,
      chargeAmount,
    } = await this._resolveLicenseExtendPricing(
      license,
      input.dto.licensePlanId,
      input.dto.billingInfo.country,
      input.dto.billingInfo.state,
    );

    await this._validateBillingCountryMatchesMarket(
      input.dto.billingInfo.country,
      marketId,
    );

    const { discountAmount, unitPrice, baseUnitPrice } =
      calculateLicensePurchasePricing(price, 1, 0);

    await this.financeService.verifyRazorpayPayment({
      razorpayOrderId: input.dto.razorpayOrderId,
      razorpayPaymentId: input.dto.razorpayPaymentId,
      razorpaySignature: input.dto.razorpaySignature,
      expectedAmount: chargeAmount,
      expectedCurrency: currencyCode,
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
          planId: resolvedPlanId ?? license.currentPlanId,
          planName: planLabel,
          transactionType: LicenseTransactionTypeEnum.RENEWAL,
          durationDays,
          baseUnitPrice,
          discountAmount,
          finalUnitPrice: unitPrice,
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
      const market = await this.marketService.getMarketWithTax({
        marketId: license.marketId,
      });
      return {
        isRedeemed: false,
        lockedPricing: null,
        marketId: license.marketId,
        currencyCode: market.currencyCode,
        countryCode: market.countryCode,
        taxProfile: market.taxProfile,
      };
    }

    const market = await this.marketService.getMarketWithTax({
      marketId: lockedPricing.marketId,
    });

    return {
      isRedeemed: true,
      lockedPricing: {
        planName: lockedPricing.lockedPlanName,
        lockedPrice: lockedPricing.lockedPrice,
        durationDays: lockedPricing.durationDays,
      },
      marketId: lockedPricing.marketId,
      currencyCode: market.currencyCode,
      countryCode: market.countryCode,
      taxProfile: market.taxProfile,
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

  async getLicenseTransactionDetails(
    input: GetLicenseTransactionDetailsServiceInput,
  ): Promise<GetLicenseTransactionDetailsServiceResult> {
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
    const marketId = await this._resolveResellerPurchaseMarketId({
      resellerId: input.resellerId,
      marketId: input.dto.marketId,
    });

    return this._createPendingPurchaseOrder({
      quantity: input.dto.quantity,
      licensePlanId: input.dto.licensePlanId,
      discountRuleId: input.dto.discountRuleId,
      discountTargetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
      resellerId: input.resellerId,
      ownerId: input.resellerId,
      marketId,
      transactionType: LicenseTransactionTypeEnum.RESELLER_PURCHASE,
      billingInfo: input.dto.billingInfo,
    });
  }

  async verifyLicensePurchaseAsReseller(
    input: PurchaseLicenseAsResellerServiceInput,
  ): Promise<PurchaseLicenseAsResellerServiceResult> {
    const marketId = await this._resolveResellerPurchaseMarketId({
      resellerId: input.resellerId,
      marketId: input.dto.marketId,
    });

    return this._verifyAndFinalizePurchase({
      quantity: input.dto.quantity,
      licensePlanId: input.dto.licensePlanId,
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
      marketId,
      transactionType: LicenseTransactionTypeEnum.RESELLER_PURCHASE,
      billingInfo: input.dto.billingInfo,
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

  async getLicenseTransactionDetailsForReseller(
    input: GetLicenseTransactionDetailsForResellerServiceInput,
  ): Promise<GetLicenseTransactionDetailsForResellerServiceResult> {
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
