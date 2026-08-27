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

export interface HandleRazorpayWebhookServiceInput {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

// ========================================
// ? PAYMENTS
// ========================================
export interface VerifyRazorpayPaymentServiceInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  expectedAmount: string;
  expectedCurrency: string;
}
