import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import { FrankfurterProvider } from "../../shared/providers/finance/frankfurter.provider";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
  RazorpayProvider,
} from "../../shared/providers/finance/razorpay.provider";
import { logger } from "../../shared/utils/core/logger";
import {
  convertCurrencyAmount,
  type ExchangeRateTable,
} from "../../shared/utils/finance/convert-currency.helper";
import { FinanceRepository } from "./finance.repository";
import type {
  CachedExchangeRatesEntity,
  GetLatestExchangeRatesServiceResult,
  HandleRazorpayWebhookServiceInput,
  RefreshExchangeRatesServiceResult,
  VerifyRazorpayPaymentServiceInput,
} from "./finance.types";

export class FinanceService {
  constructor(
    private readonly frankfurterProvider: FrankfurterProvider,
    private readonly financeRepository: FinanceRepository,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  // ========================================
  // ? USER CLIENT
  // ========================================
  async getLatestRates(): Promise<GetLatestExchangeRatesServiceResult> {
    const cached = await this.financeRepository.getCachedExchangeRates();
    if (cached) return cached;

    const refreshed = await this.refreshRates();
    if (!refreshed) {
      throw new AppError("Exchange rates are not available yet", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.EXCHANGE_RATE_UNAVAILABLE,
      });
    }

    return refreshed;
  }

  async refreshRates(): Promise<RefreshExchangeRatesServiceResult> {
    const cached = await this.financeRepository.getCachedExchangeRates();

    let latest;
    try {
      latest = await this.frankfurterProvider.getLatestRates(
        env.FRANKFURTER_BASE_CURRENCY,
      );
    } catch (error) {
      logger.error(
        "[FinanceService] Failed to fetch rates from Frankfurter; keeping latest cached rate",
        error,
      );
      return cached;
    }

    const isNewer = !cached || latest.rateDate > cached.rateDate;
    if (!isNewer) {
      logger.log(
        `[FinanceService] No newer rate published yet (cached rateDate=${cached?.rateDate}, provider rateDate=${latest.rateDate})`,
      );
      return null;
    }

    const updated: CachedExchangeRatesEntity = {
      base: latest.base,
      rates: latest.rates,
      rateDate: latest.rateDate,
      fetchedAt: new Date().toISOString(),
    };
    await this.financeRepository.setCachedExchangeRates(updated);
    logger.log(
      `[FinanceService] Cached new exchange rates for rateDate=${updated.rateDate}`,
    );

    return updated;
  }

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handleRazorpayWebhook(
    input: HandleRazorpayWebhookServiceInput,
  ): Promise<void> {
    logger.log(
      `[FinanceService] Razorpay webhook received: ${JSON.stringify({
        headers: input.headers,
        body: input.body,
      })}`,
    );
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
  // ? CURRENCY METHODS
  // ========================================
  async convertAmountToTargetCurrency(params: {
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    exchangeRates?: ExchangeRateTable;
  }): Promise<number | null> {
    if (params.sourceCurrency === params.targetCurrency) {
      return params.amount;
    }

    const exchangeRates =
      params.exchangeRates ?? (await this.getLatestRates().catch(() => null));

    if (!exchangeRates) {
      logger.warn(
        `[FinanceService] Exchange rates unavailable; cannot convert ${params.sourceCurrency} to ${params.targetCurrency}`,
      );
      return null;
    }

    return convertCurrencyAmount({
      amount: params.amount,
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      exchangeRates,
    });
  }
}
