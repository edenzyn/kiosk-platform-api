import { env } from "../../config/env";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { RedisProvider } from "../../shared/providers/redis/redis.provider";
import type { CachedExchangeRatesEntity } from "./finance.types";

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
}
