import { env } from "../../config/env";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { RedisProvider } from "../../shared/providers/redis/redis.provider";
import type {
  CachedExchangeRatesEntity,
  CachedSupportedCurrenciesEntity,
} from "./finance.types";

export class FinanceRepository {
  constructor(private readonly redisProvider: RedisProvider) {}

  async getCachedExchangeRates(): Promise<CachedExchangeRatesEntity | null> {
    return this.redisProvider.getJson<CachedExchangeRatesEntity>(
      RedisKeys.financeExchangeRatesLatest,
    );
  }

  async setCachedExchangeRates(
    data: CachedExchangeRatesEntity,
  ): Promise<void> {
    const ttlSeconds = env.FINANCE_EXCHANGE_RATE_CACHE_TTL_HOURS * 60 * 60;
    await this.redisProvider.setJson(
      RedisKeys.financeExchangeRatesLatest,
      data,
      ttlSeconds,
    );
  }

  async getCachedSupportedCurrencies(): Promise<CachedSupportedCurrenciesEntity | null> {
    return this.redisProvider.getJson<CachedSupportedCurrenciesEntity>(
      RedisKeys.financeSupportedCurrencies,
    );
  }

  async setCachedSupportedCurrencies(
    data: CachedSupportedCurrenciesEntity,
  ): Promise<void> {
    const ttlSeconds = env.FINANCE_CURRENCIES_CACHE_TTL_DAYS * 24 * 60 * 60;
    await this.redisProvider.setJson(
      RedisKeys.financeSupportedCurrencies,
      data,
      ttlSeconds,
    );
  }
}
