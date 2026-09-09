import type { AppTaxComponentEntity } from "./schemas/app-tax-component.schema";
import type { AppTaxProfileEntity } from "./schemas/app-tax-profile.schema";
import type { AppTaxRuleEntity } from "./schemas/app-tax-rule.schema";

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
export type TaxProfileWithRules = AppTaxProfileEntity & {
  rules: (AppTaxRuleEntity & { components: AppTaxComponentEntity[] })[];
};

export interface CreateTaxRuleComponentDto {
  name: string;
  rate: number;
}

export interface CreateTaxProfileRuleDto {
  name: string;
  conditionType: number;
  priority?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  components: CreateTaxRuleComponentDto[];
}

// ========================================
// ? TAX — REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneTaxProfileRepoInput {
  id: string;
}
export type FindOneTaxProfileRepoResult = AppTaxProfileEntity | null;

export interface FindTaxProfileRulesRepoInput {
  taxProfileId: string;
}
export type FindTaxProfileRulesRepoResult = AppTaxRuleEntity[];

export interface FindTaxRuleComponentsRepoInput {
  taxRuleIds: string[];
}
export type FindTaxRuleComponentsRepoResult = Map<
  string,
  AppTaxComponentEntity[]
>;

export interface CreateTaxProfileRepoInput {
  name: string;
  isTaxInclusive: boolean;
  rules: CreateTaxProfileRuleDto[];
  createdBy: string;
}
export type CreateTaxProfileRepoResult = AppTaxProfileEntity;

export interface UpdateTaxProfileRepoInput {
  taxProfileId: string;
  name: string;
  isTaxInclusive: boolean;
  rules: CreateTaxProfileRuleDto[];
  updatedBy: string;
}
export type UpdateTaxProfileRepoResult = AppTaxProfileEntity;
