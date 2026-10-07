import { env } from "../../../config/env";
import {
  PAYMENT_CONFIG_SECRET_KEYS,
  PAYMENT_CONNECTION_TEST_SUPPORT,
} from "../../../shared/constants/payment-config.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { PaymentProviderSlugEnum } from "../../../shared/enums/finance/payment-provider-slug.enum";
import { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { BadRequestError } from "../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../shared/errors/not-found-error";
import { PaymentRequiredError } from "../../../shared/errors/payment-required-error";
import type { PhonePeProvider } from "../../../shared/providers/finance/phonepe/phonepe.provider";
import type { PhonePeQrPaymentConfig } from "../../../shared/providers/finance/phonepe/phonepe.types";
import type { RazorpayProvider } from "../../../shared/providers/finance/razorpay/razorpay.provider";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
} from "../../../shared/providers/finance/razorpay/razorpay.types";
import {
  decryptData,
  encryptData,
} from "../../../shared/utils/core/crypto.helper";
import { logger } from "../../../shared/utils/core/logger";
import type { BranchRepository } from "../../branch/branch.repository";
import type { DeviceRepository } from "../../device/device.repository";
import type { LicenseTransactionRepository } from "../../license/repositories/license-transaction.repository";
import type { MarketRepository } from "../../market/market.repository";
import type { PaymentProviderRepository } from "../repositories/payment-provider.repository";
import type {
  CreateQrPaymentServiceInput,
  CreateQrPaymentServiceResult,
  GetDevicePaymentMethodsServiceInput,
  GetDevicePaymentMethodsServiceResult,
  GetPaymentProvidersServiceInput,
  GetPaymentProvidersServiceResult,
  GetTenantPaymentConfigsServiceInput,
  GetTenantPaymentConfigsServiceResult,
  HandleRazorpayWebhookServiceInput,
  PaymentProviderWithMappings,
  PaymentServiceResult,
  SaveCashPaymentConfigServiceInput,
  SaveCashPaymentConfigServiceResult,
  SaveTenantPaymentConfigServiceInput,
  SaveTenantPaymentConfigServiceResult,
  TenantPaymentConfigValues,
  TestTenantPaymentConfigServiceInput,
  TestTenantPaymentConfigServiceResult,
  TogglePaymentProviderStatusServiceInput,
  UpdatePaymentProviderWithMappingsRepoInput,
  UpdatePaymentServiceInput,
  VerifyRazorpayPaymentServiceInput,
} from "../types/payment-provider.types";
import { PaymentProviderValidator } from "../validators/payment-provider.validator";

export class PaymentProviderService {
  constructor(
    private readonly razorpayProvider: RazorpayProvider,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly paymentProviderRepository: PaymentProviderRepository,
    private readonly marketRepository: MarketRepository,
    private readonly branchRepository: BranchRepository,
    private readonly phonePeProvider: PhonePeProvider,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handleRazorpayWebhook(
    input: HandleRazorpayWebhookServiceInput,
  ): Promise<void> {
    logger.log(
      `[PaymentProviderService] Razorpay webhook received: ${JSON.stringify({
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
      throw new PaymentRequiredError("Payment verification failed", {
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
      throw new PaymentRequiredError("Payment verification failed", {
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
      await this.paymentProviderRepository.findPaginatedWithMappings({
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
          throw new NotFoundError("Payment provider mapping not found");
        }
        if (current.isActive !== mapping.isActive) {
          mappingsToUpdate.push({ id: mapping.id, isActive: mapping.isActive });
        }
        continue;
      }

      if (
        existingMappingKeys.has(`${mapping.marketId}:${mapping.paymentMethod}`)
      ) {
        throw new ConflictError(
          "This payment method is already mapped to the market for this provider",
        );
      }
      mappingsToCreate.push({
        marketId: mapping.marketId,
        paymentMethod: mapping.paymentMethod,
        isActive: mapping.isActive,
      });
    }

    await this.paymentProviderRepository.updateWithMappings({
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

    await this.paymentProviderRepository.update({
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
      throw new BadRequestError(
        "A branch must be selected to manage payment configs",
      );
    }

    const market = await this.marketRepository.findMarketByBranch({
      branchId: effectiveTenant.branchId,
    });
    if (!market) {
      throw new BadRequestError("This branch has no market");
    }

    const [settings, configs, options] = await Promise.all([
      this.branchRepository.getOrCreateSettings(effectiveTenant.branchId),
      this.paymentProviderRepository.findTenantPaymentConfigs({
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
      }),
      this.paymentProviderRepository.findTenantPaymentOptions({
        marketId: market.id,
      }),
    ]);

    return {
      isCashPaymentEnabled: settings.isCashPaymentEnabled,
      configs,
      options,
    };
  }

  async getDevicePaymentMethods(
    input: GetDevicePaymentMethodsServiceInput,
  ): Promise<GetDevicePaymentMethodsServiceResult> {
    const { device } = input;

    const [{ isCashPaymentEnabled, configs, options }, deviceRecord] =
      await Promise.all([
        this.getTenantPaymentConfigs({
          effectiveTenant: {
            organizationId: device.organizationId,
            branchId: device.branchId,
          },
        }),
        this.deviceRepository.findOne({ id: device.id }),
      ]);

    const enabledMethods = configs
      .filter(
        (config) =>
          config.isActive &&
          options.some((option) => option.mapperId === config.mapperId),
      )
      .map((config) => config.paymentMethod);

    return {
      isCashPaymentEnabled,
      isQrPaymentEnabled: enabledMethods.includes(TenantPaymentMethodEnum.QR),
      isCardPaymentEnabled:
        enabledMethods.includes(TenantPaymentMethodEnum.CARD) &&
        Boolean(deviceRecord?.terminalId),
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
      ? PaymentProviderValidator.paymentConfigs[option.provider.slug]?.[
          option.paymentMethod
        ]
      : undefined;
    if (!option || !configSchema) {
      throw new NotFoundError("This payment provider is not available");
    }
    const hasOtherEnabledMethod =
      isCashPaymentEnabled ||
      configs.some(
        (config) =>
          config.isActive &&
          config.mapperId !== dto.mapperId &&
          options.some((item) => item.mapperId === config.mapperId),
      );
    if (!dto.isActive && !hasOtherEnabledMethod) {
      throw new BadRequestError("At least one payment method must be enabled");
    }

    const isTestable = Boolean(
      PAYMENT_CONNECTION_TEST_SUPPORT[option.provider.slug]?.includes(
        option.paymentMethod,
      ),
    );
    if (isTestable) {
      await this.testTenantPaymentConfig({
        effectiveTenant,
        dto: { mapperId: dto.mapperId, config: dto.config },
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

    await this.paymentProviderRepository.saveTenantPaymentConfig({
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId as string,
      mapperId: dto.mapperId,
      paymentMethod: option.paymentMethod,
      isActive: dto.isActive,
      config: config as unknown as TenantPaymentConfigValues,
      lastConnectionTest: isTestable ? new Date() : undefined,
      userId: user.id,
    });

    return this.getTenantPaymentConfigs({ effectiveTenant });
  }

  async testTenantPaymentConfig(
    input: TestTenantPaymentConfigServiceInput,
  ): Promise<TestTenantPaymentConfigServiceResult> {
    const { effectiveTenant, dto } = input;

    const { configs, options } = await this.getTenantPaymentConfigs({
      effectiveTenant,
    });

    const option = options.find((item) => item.mapperId === dto.mapperId);
    const configSchema = option
      ? PaymentProviderValidator.paymentConfigs[option.provider.slug]?.[
          option.paymentMethod
        ]
      : undefined;
    if (!option || !configSchema) {
      throw new NotFoundError("This payment provider is not available");
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

    const credentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value) {
        credentials[key] = value;
      } else if (secretKeys.includes(key) && storedConfig[key]) {
        credentials[key] = decryptData(
          storedConfig[key],
          env.LICENSE_ENCRYPTION_KEY,
        );
      }
    }

    if (
      option.provider.slug === PaymentProviderSlugEnum.PHONEPE &&
      option.paymentMethod === TenantPaymentMethodEnum.QR
    ) {
      const phonePeConfig = credentials as unknown as PhonePeQrPaymentConfig;
      await this.phonePeProvider.getAccessToken({
        clientId: phonePeConfig.clientId,
        clientSecret: phonePeConfig.clientSecret,
        clientVersion: phonePeConfig.clientVersion,
      });

      return { isSuccessful: true };
    }

    throw new BadRequestError(
      "Testing the connection isn't available for this provider yet",
    );
  }

  // ========================================
  // ? DEVICE CHECKOUT PAYMENTS
  // ========================================
  async createQrPayment(
    input: CreateQrPaymentServiceInput,
  ): Promise<CreateQrPaymentServiceResult> {
    const { organizationId, branchId, merchantOrderId, amount, currencyCode } =
      input;

    const { configs, options } = await this.getTenantPaymentConfigs({
      effectiveTenant: { organizationId, branchId },
    });

    const config = configs.find(
      (item) =>
        item.isActive &&
        item.paymentMethod === TenantPaymentMethodEnum.QR &&
        options.some((option) => option.mapperId === item.mapperId),
    );
    const option = options.find((item) => item.mapperId === config?.mapperId);
    if (!config || !option) {
      throw new BadRequestError("QR payment isn't available at this branch");
    }

    if (option.provider.slug !== PaymentProviderSlugEnum.PHONEPE) {
      throw new BadRequestError("This QR payment provider isn't supported yet");
    }

    const storedConfig = config.config as PhonePeQrPaymentConfig;
    const payment = await this.phonePeProvider.createQrPayment({
      credentials: {
        clientId: storedConfig.clientId,
        clientVersion: storedConfig.clientVersion,
        clientSecret: decryptData(
          storedConfig.clientSecret,
          env.LICENSE_ENCRYPTION_KEY,
        ),
      },
      merchantOrderId,
      amount,
      currencyCode,
      expireAfterSeconds: env.TENANT_QR_PAYMENT_EXPIRY_SECONDS,
    });

    const qrWindowEndsAt = new Date(
      Date.now() + env.TENANT_QR_PAYMENT_EXPIRY_SECONDS * 1000,
    );

    return {
      paymentProviderId: option.provider.id,
      providerSlug: option.provider.slug,
      providerOrderId: payment.providerOrderId,
      providerStatus: payment.state,
      qrData: payment.qrData,
      expiresAt:
        payment.expiresAt < qrWindowEndsAt ? payment.expiresAt : qrWindowEndsAt,
      requestPayload: payment.requestPayload,
      responsePayload: payment.responsePayload,
    };
  }

  async saveCashPaymentConfig(
    input: SaveCashPaymentConfigServiceInput,
  ): Promise<SaveCashPaymentConfigServiceResult> {
    const { effectiveTenant, dto } = input;

    const { configs, options } = await this.getTenantPaymentConfigs({
      effectiveTenant,
    });

    const hasProviderMethodEnabled = configs.some(
      (config) =>
        config.isActive &&
        options.some((item) => item.mapperId === config.mapperId),
    );
    if (!dto.isEnabled && !hasProviderMethodEnabled) {
      throw new BadRequestError("At least one payment method must be enabled");
    }

    await this.branchRepository.updateSettings({
      branchId: effectiveTenant.branchId as string,
      data: { isCashPaymentEnabled: dto.isEnabled },
    });

    return this.getTenantPaymentConfigs({ effectiveTenant });
  }

  private async getProviderOrThrow(providerId: string) {
    const provider = await this.paymentProviderRepository.findOne({
      id: providerId,
    });
    if (!provider) {
      throw new NotFoundError("Payment provider not found");
    }

    return provider;
  }

  private async getProviderWithMappingsOrThrow(
    providerId: string,
  ): Promise<PaymentProviderWithMappings> {
    const provider = await this.paymentProviderRepository.findOneWithMappings({
      id: providerId,
    });
    if (!provider) {
      throw new NotFoundError("Payment provider not found");
    }

    return provider;
  }
}
