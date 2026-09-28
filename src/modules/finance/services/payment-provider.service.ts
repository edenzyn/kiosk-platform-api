import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { PaymentStatusEnum } from "../../../shared/enums/license/payment-status.enum";
import { AppError } from "../../../shared/errors/app-error";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
  RazorpayProvider,
} from "../../../shared/providers/finance/razorpay.provider";
import { logger } from "../../../shared/utils/core/logger";
import type { LicenseTransactionRepository } from "../../license/repositories/license-transaction.repository";
import type { PaymentProviderRepository } from "../repositories/payment-provider.repository";
import type {
  CreatePaymentProviderServiceInput,
  GetPaymentProvidersServiceInput,
  GetPaymentProvidersServiceResult,
  HandleRazorpayWebhookServiceInput,
  PaymentProviderServiceResult,
  PaymentProviderWithMappings,
  TogglePaymentProviderStatusServiceInput,
  UpdatePaymentProviderServiceInput,
  UpdatePaymentProviderWithMappingsRepoInput,
  VerifyRazorpayPaymentServiceInput,
} from "../types/payment-provider.types";

export class PaymentProviderService {
  constructor(
    private readonly razorpayProvider: RazorpayProvider,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly paymentProviderRepository: PaymentProviderRepository,
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

  async createPaymentProvider(
    input: CreatePaymentProviderServiceInput,
  ): Promise<PaymentProviderServiceResult> {
    const { dto, currentUser } = input;

    const existing = await this.paymentProviderRepository.findOneBySlug({
      slug: dto.slug,
    });
    if (existing) {
      throw new AppError("A payment provider with this slug already exists", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    const provider = await this.paymentProviderRepository.createWithMappings({
      name: dto.name,
      slug: dto.slug,
      mappings: dto.mappings,
      createdBy: currentUser.id,
    });

    return { provider: await this.getProviderWithMappingsOrThrow(provider.id) };
  }

  async updatePaymentProvider(
    input: UpdatePaymentProviderServiceInput,
  ): Promise<PaymentProviderServiceResult> {
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

    await this.paymentProviderRepository.updateWithMappings({
      providerId,
      name: dto.name,
      mappingsToUpdate,
      mappingsToCreate,
      updatedBy: currentUser.id,
    });

    return { provider: await this.getProviderWithMappingsOrThrow(providerId) };
  }

  async togglePaymentProviderStatus(
    input: TogglePaymentProviderStatusServiceInput,
  ): Promise<PaymentProviderServiceResult> {
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

  private async getProviderOrThrow(providerId: string) {
    const provider = await this.paymentProviderRepository.findOne({
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
    const provider = await this.paymentProviderRepository.findOneWithMappings({
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
