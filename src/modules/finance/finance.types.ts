// ========================================
// ? CACHE ENTITY
// ========================================
export interface CachedExchangeRatesEntity {
  base: string;
  rates: Record<string, number>;
  rateDate: string;
  fetchedAt: string;
}

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export type GetLatestExchangeRatesServiceResult = CachedExchangeRatesEntity;

export type RefreshExchangeRatesServiceResult =
  CachedExchangeRatesEntity | null;
