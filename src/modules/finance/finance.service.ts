import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import { FrankfurterProvider } from "../../shared/providers/finance/frankfurter.provider";
import { logger } from "../../shared/utils/core/logger";
import { FinanceRepository } from "./finance.repository";
import type {
  CachedExchangeRatesEntity,
  GetLatestExchangeRatesServiceResult,
  HandleRazorpayWebhookServiceInput,
  RefreshExchangeRatesServiceResult,
} from "./finance.types";

export class FinanceService {
  constructor(
    private readonly frankfurterProvider: FrankfurterProvider,
    private readonly financeRepository: FinanceRepository,
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
}
