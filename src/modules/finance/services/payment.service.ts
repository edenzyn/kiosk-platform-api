import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { PAYMENT_CONFIG_SECRET_KEYS } from "../../../shared/constants/payment-config.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { AppError } from "../../../shared/errors/app-error";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
  RazorpayProvider,
} from "../../../shared/providers/finance/razorpay.provider";
import { encryptData } from "../../../shared/utils/core/crypto.helper";
import { logger } from "../../../shared/utils/core/logger";
import type { LicenseTransactionRepository } from "../../license/repositories/license-transaction.repository";
import type { BranchRepository } from "../../branch/branch.repository";
import type { MarketRepository } from "../../market/market.repository";
import type { PaymentRepository } from "../repositories/payment.repository";
import type {
  GetPaymentProvidersServiceInput,
  GetPaymentProvidersServiceResult,
  GetTenantPaymentConfigsServiceInput,
  GetTenantPaymentConfigsServiceResult,
  HandleRazorpayWebhookServiceInput,
  PaymentServiceResult,
  PaymentProviderWithMappings,
  SaveCashPaymentConfigServiceInput,
  SaveCashPaymentConfigServiceResult,
  SaveTenantPaymentConfigServiceInput,
  SaveTenantPaymentConfigServiceResult,
  TenantPaymentConfigValues,
  TogglePaymentProviderStatusServiceInput,
  UpdatePaymentServiceInput,
  UpdatePaymentProviderWithMappingsRepoInput,
  VerifyRazorpayPaymentServiceInput,
} from "../types/payment.types";
import { PaymentValidator } from "../validators/payment.validator";

export class PaymentService {
  constructor(
    private readonly razorpayProvider: RazorpayProvider,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly marketRepository: MarketRepository,
    private readonly branchRepository: BranchRepository,
  ) {}

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handleRazorpayWebhook(
    input: HandleRazorpayWebhookServiceInput,
  ): Promise<void> {
    logger.log(
      `[PaymentService] Razorpay webhook received: ${JSON.stringify({
        headers: input.headers,
        body: input.body,
      })}`,
    );

    const { event, payload } = input.body;
    const payment = payload.payment?.entity;
    if (!payment?.order_id) return;

    if (event === "payment.failed") {
      const failureReason =
        payment.error_description ?? payment.error_reason ?? "Payment failed";

      await this.licenseTransactionRepository.updateTransactionStatusByOrderId({
        paymentProviderOrderId: payment.order_id,
        currentPaymentStatus: PaymentStatusEnum.PENDING,
        newPaymentStatus: PaymentStatusEnum.FAILED,
        paymentReference: payment.id,
        failureReason,
      });
    }
  }

  // ========================================
  // ? PAYMENTS
  // ========================================
  async createRazorpayOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<CreateRazorpayOrderResult> {
    return this.razorpayProvider.createOrder(input);
  }

  async verifyRazorpayPayment(
    params: VerifyRazorpayPaymentServiceInput,
  ): Promise<void> {
    const isSignatureValid = this.razorpayProvider.verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
    if (!isSignatureValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    const order = await this.razorpayProvider.fetchOrder(
      params.razorpayOrderId,
    );

    const expectedAmountInSubunits = Math.round(
      Number(params.expectedAmount) * 100,
    );
    const isValid =
      order.status === "paid" &&
      order.amount === expectedAmountInSubunits &&
      order.currency === params.expectedCurrency;

    if (!isValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }
  }

  // ========================================
  // ? PLATFORM PAYMENT PROVIDERS
  // ========================================
  async getPaymentProviders(
    input: GetPaymentProvidersServiceInput,
  ): Promise<GetPaymentProvidersServiceResult> {
    const { page, limit, search, isActive, sortBy, sortOrder } = input.query;

    const { providers, total } =
      await this.paymentRepository.findPaginatedWithMappings({
        page,
        limit,
        search,
        isActive,
        sortBy,
        sortOrder,
      });

    return {
      providers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePaymentProvider(
    input: UpdatePaymentServiceInput,
  ): Promise<PaymentServiceResult> {
    const { providerId, dto, currentUser } = input;
    const existing = await this.getProviderWithMappingsOrThrow(providerId);

    const existingMappingsById = new Map(
      existing.mappings.map((mapping) => [mapping.id, mapping]),
    );
    const existingMappingKeys = new Set(
      existing.mappings.map(
        (mapping) => `${mapping.marketId}:${mapping.paymentMethod}`,
      ),
    );

    const mappingsToUpdate: UpdatePaymentProviderWithMappingsRepoInput["mappingsToUpdate"] =
      [];
    const mappingsToCreate: UpdatePaymentProviderWithMappingsRepoInput["mappingsToCreate"] =
      [];

    for (const mapping of dto.mappings) {
      if (mapping.id) {
        const current = existingMappingsById.get(mapping.id);
        if (!current) {
          throw new AppError("Payment provider mapping not found", {
            statusCode: HttpStatusCodes.NOT_FOUND,
            code: ErrorCodes.RESOURCE_NOT_FOUND,
          });
        }
        if (current.isActive !== mapping.isActive) {
          mappingsToUpdate.push({ id: mapping.id, isActive: mapping.isActive });
        }
        continue;
      }

      if (
        existingMappingKeys.has(`${mapping.marketId}:${mapping.paymentMethod}`)
      ) {
        throw new AppError(
          "This payment method is already mapped to the market for this provider",
          {
            statusCode: HttpStatusCodes.CONFLICT,
            code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
          },
        );
      }
      mappingsToCreate.push({
        marketId: mapping.marketId,
        paymentMethod: mapping.paymentMethod,
        isActive: mapping.isActive,
      });
    }

    await this.paymentRepository.updateWithMappings({
      providerId,
      mappingsToUpdate,
      mappingsToCreate,
      updatedBy: currentUser.id,
    });

    return { provider: await this.getProviderWithMappingsOrThrow(providerId) };
  }

  async togglePaymentProviderStatus(
    input: TogglePaymentProviderStatusServiceInput,
  ): Promise<PaymentServiceResult> {
    const existing = await this.getProviderOrThrow(input.providerId);

    await this.paymentRepository.update({
      providerId: input.providerId,
      updatedBy: input.currentUser.id,
      data: { isActive: !existing.isActive },
    });

    return {
      provider: await this.getProviderWithMappingsOrThrow(input.providerId),
    };
  }

  // ========================================
  // ? TENANT PAYMENT CONFIGS
  // ========================================
  async getTenantPaymentConfigs(
    input: GetTenantPaymentConfigsServiceInput,
  ): Promise<GetTenantPaymentConfigsServiceResult> {
    const { effectiveTenant } = input;
    if (!effectiveTenant.branchId) {
      throw new AppError(
        "A branch must be selected to manage payment configs",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        },
      );
    }

    const market = await this.marketRepository.findMarketByBranch({
      branchId: effectiveTenant.branchId,
    });
    if (!market) {
      throw new AppError("This branch has no market", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const [settings, configs, options] = await Promise.all([
      this.branchRepository.getOrCreateSettings(effectiveTenant.branchId),
      this.paymentRepository.findTenantPaymentConfigs({
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
      }),
      this.paymentRepository.findTenantPaymentOptions({
        marketId: market.id,
      }),
    ]);

    return {
      isCashPaymentEnabled: settings.isCashPaymentEnabled,
      configs,
      options,
    };
  }

  async saveTenantPaymentConfig(
    input: SaveTenantPaymentConfigServiceInput,
  ): Promise<SaveTenantPaymentConfigServiceResult> {
    const { effectiveTenant, user, dto } = input;

    const { isCashPaymentEnabled, configs, options } =
      await this.getTenantPaymentConfigs({ effectiveTenant });

    const option = options.find((item) => item.mapperId === dto.mapperId);
    const configSchema = option
      ? PaymentValidator.paymentConfigs[option.provider.slug]?.[
          option.paymentMethod
        ]
      : undefined;
    if (!option || !configSchema) {
      throw new AppError("This payment provider is not available", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    // A branch must always be able to take payment. Only configs whose
    // provider is still offered count.
    const hasOtherEnabledMethod =
      isCashPaymentEnabled ||
      configs.some(
        (config) =>
          config.isActive &&
          config.mapperId !== dto.mapperId &&
          options.some((item) => item.mapperId === config.mapperId),
      );
    if (!dto.isActive && !hasOtherEnabledMethod) {
      throw new AppError("At least one payment method must be enabled", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const storedConfig = (configs.find(
      (config) => config.mapperId === dto.mapperId,
    )?.config ?? {}) as Record<string, string>;
    const secretKeys = PAYMENT_CONFIG_SECRET_KEYS[option.provider.slug] ?? [];
    const storedSecretKeys = secretKeys.filter((key) => storedConfig[key]);

    const validated = (await configSchema.validate(dto.config, {
      abortEarly: false,
      stripUnknown: true,
      context: { storedSecretKeys },
    })) as Record<string, string | undefined>;

    // Secrets are encrypted; a blank one keeps the stored value.
    const config: Record<string, string> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (!secretKeys.includes(key)) {
        if (value) config[key] = value;
        continue;
      }
      if (value) {
        config[key] = encryptData(value, env.LICENSE_ENCRYPTION_KEY);
      } else if (storedConfig[key]) {
        config[key] = storedConfig[key];
      }
    }

    await this.paymentRepository.saveTenantPaymentConfig({
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId as string,
      mapperId: dto.mapperId,
      paymentMethod: option.paymentMethod,
      isActive: dto.isActive,
      config: config as unknown as TenantPaymentConfigValues,
      userId: user.id,
    });

    return this.getTenantPaymentConfigs({ effectiveTenant });
  }

  async saveCashPaymentConfig(
    input: SaveCashPaymentConfigServiceInput,
  ): Promise<SaveCashPaymentConfigServiceResult> {
    const { effectiveTenant, dto } = input;

    const { configs, options } = await this.getTenantPaymentConfigs({
      effectiveTenant,
    });

    // A branch must always be able to take payment, so cash can only be
    // switched off while QR or card is on.
    const hasProviderMethodEnabled = configs.some(
      (config) =>
        config.isActive &&
        options.some((item) => item.mapperId === config.mapperId),
    );
    if (!dto.isEnabled && !hasProviderMethodEnabled) {
      throw new AppError("At least one payment method must be enabled", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    await this.branchRepository.updateSettings({
      branchId: effectiveTenant.branchId as string,
      data: { isCashPaymentEnabled: dto.isEnabled },
    });

    return this.getTenantPaymentConfigs({ effectiveTenant });
  }

  private async getProviderOrThrow(providerId: string) {
    const provider = await this.paymentRepository.findOne({
      id: providerId,
    });
    if (!provider) {
      throw new AppError("Payment provider not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return provider;
  }

  private async getProviderWithMappingsOrThrow(
    providerId: string,
  ): Promise<PaymentProviderWithMappings> {
    const provider = await this.paymentRepository.findOneWithMappings({
      id: providerId,
    });
    if (!provider) {
      throw new AppError("Payment provider not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return provider;
  }
}
