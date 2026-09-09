import type { AppTaxComponentEntity } from "./schemas/app-tax-component.schema";
import type { AppTaxProfileEntity } from "./schemas/app-tax-profile.schema";

// ========================================
// ? CACHE ENTITY
// ========================================
export interface CachedExchangeRatesEntity {
  base: string;
  rates: Record<string, number>;
  rateDate: string;
  fetchedAt: string;
}

export interface SupportedCurrencyEntity {
  code: string;
  name: string;
  symbol: string;
}

export interface CachedSupportedCurrenciesEntity {
  currencies: SupportedCurrencyEntity[];
  fetchedAt: string;
}

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export type GetLatestExchangeRatesServiceResult = CachedExchangeRatesEntity;

export type RefreshExchangeRatesServiceResult =
  CachedExchangeRatesEntity | null;

export type GetSupportedCurrenciesServiceResult =
  CachedSupportedCurrenciesEntity;

export interface HandleRazorpayWebhookServiceInput {
  headers: Record<string, string | string[] | undefined>;
  body: RazorpayWebhookPayload;
}

// ========================================
// ? RAZORPAY WEBHOOK PAYLOAD
// ========================================
export interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string | null;
  status: string;
  error_code: string | null;
  error_description: string | null;
  error_reason: string | null;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: RazorpayWebhookPaymentEntity;
    };
  };
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

// ========================================
// ? TAX — SHARED TYPES
// ========================================
// Tax configuration is embedded in the Market create/update/get APIs
// (MarketService), not exposed as standalone tax-profile endpoints.
export type TaxProfileWithComponents = AppTaxProfileEntity & {
  components: AppTaxComponentEntity[];
};

export interface CreateTaxComponentDto {
  name: string;
  conditionType: number;
  rate: number;
}

// ========================================
// ? TAX — REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneTaxProfileRepoInput {
  id: string;
}
export type FindOneTaxProfileRepoResult = AppTaxProfileEntity | null;

export interface FindComponentsByProfileIdRepoInput {
  taxProfileId: string;
}
export type FindComponentsByProfileIdRepoResult = AppTaxComponentEntity[];

export interface CreateTaxProfileRepoInput {
  name: string;
  isTaxInclusive: boolean;
  components: CreateTaxComponentDto[];
  createdBy: string;
}
export type CreateTaxProfileRepoResult = AppTaxProfileEntity;

export interface UpdateTaxProfileRepoInput {
  taxProfileId: string;
  name: string;
  isTaxInclusive: boolean;
  components: CreateTaxComponentDto[];
  updatedBy: string;
}
export type UpdateTaxProfileRepoResult = AppTaxProfileEntity;
