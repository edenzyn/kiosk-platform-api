import type { EffectiveTenant } from "../../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import type { PhonePeQrPaymentConfig } from "../../../shared/providers/finance/phonepe.provider";
import type { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import type { PaymentProviderMarketMapperEntity } from "../schemas/payment-provider-market-mapper.schema";
import type { PaymentProviderEntity } from "../schemas/payment-provider.schema";

// ========================================
// ? PLATFORM PAYMENT PROVIDER TYPES
// ========================================
export interface PaymentProviderMarketSummary {
  id: string;
  name: string;
  countryCode: string;
  currencyCode: string;
}

export type PaymentProviderMappingWithMarket =
  PaymentProviderMarketMapperEntity & {
    market: PaymentProviderMarketSummary;
  };

export type PaymentProviderWithMappings = PaymentProviderEntity & {
  mappings: PaymentProviderMappingWithMarket[];
};

export interface CreatePaymentProviderMappingDto {
  marketId: string;
  paymentMethod: TenantPaymentMethodEnum;
}

// A mapping with an id is an existing one (only its active flag can change);
// one without an id is created.
export interface UpdatePaymentProviderMappingDto extends CreatePaymentProviderMappingDto {
  id?: string;
  isActive: boolean;
}

// ========================================
// ? PLATFORM PAYMENT PROVIDER — SERVICE INPUTS & RESULTS
// ========================================
export interface UpdatePaymentServiceInput {
  providerId: string;
  dto: {
    mappings: UpdatePaymentProviderMappingDto[];
  };
  currentUser: UserTokenDto;
}

export interface TogglePaymentProviderStatusServiceInput {
  providerId: string;
  currentUser: UserTokenDto;
}

export interface GetPaymentProvidersServiceInput {
  query: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export interface GetPaymentProvidersServiceResult {
  providers: PaymentProviderWithMappings[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentServiceResult {
  provider: PaymentProviderWithMappings;
}

// ========================================
// ? PLATFORM PAYMENT PROVIDER — REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOnePaymentProviderRepoInput {
  id: string;
}
export type FindOnePaymentProviderRepoResult = PaymentProviderEntity | null;

export interface FindOnePaymentProviderWithMappingsRepoInput {
  id: string;
}
export type FindOnePaymentProviderWithMappingsRepoResult =
  PaymentProviderWithMappings | null;

export interface FindPaginatedPaymentProvidersRepoInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindPaginatedPaymentProvidersRepoResult {
  providers: PaymentProviderWithMappings[];
  total: number;
}

export interface UpdatePaymentProviderRepoInput {
  providerId: string;
  updatedBy: string;
  data: Partial<{
    isActive: boolean;
  }>;
}
export type UpdatePaymentProviderRepoResult = PaymentProviderEntity;

export interface UpdatePaymentProviderWithMappingsRepoInput {
  providerId: string;
  mappingsToUpdate: Array<{ id: string; isActive: boolean }>;
  mappingsToCreate: Array<
    CreatePaymentProviderMappingDto & { isActive: boolean }
  >;
  updatedBy: string;
}
export type UpdatePaymentProviderWithMappingsRepoResult =
  PaymentProviderEntity;

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
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
// ? TENANT PAYMENT CONFIG MODELS
// ========================================
// The terminal id is per device, so it lives on the device, not here.
export interface PineLabsCardPaymentConfig {
  merchantId: string;
  // Stored encrypted.
  securityToken: string;
}

export type TenantPaymentConfigValues =
  | PhonePeQrPaymentConfig
  | PineLabsCardPaymentConfig;

// ========================================
// ? TENANT PAYMENT CONFIGS
// ========================================
export interface TenantPaymentProviderOption {
  mapperId: string;
  paymentMethod: TenantPaymentMethodEnum;
  provider: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface TenantPaymentConfigSummary {
  mapperId: string;
  paymentMethod: TenantPaymentMethodEnum;
  isActive: boolean;
  // Stored as-is; secret keys hold their encrypted value.
  config: TenantPaymentConfigValues;
  lastConnectionTest: Date | null;
}

export interface TestTenantPaymentConfigServiceInput {
  effectiveTenant: EffectiveTenant;
  dto: {
    mapperId: string;
  };
}
export type TestTenantPaymentConfigServiceResult =
  GetTenantPaymentConfigsServiceResult;

export interface UpdateTenantPaymentConnectionTestRepoInput {
  branchId: string;
  mapperId: string;
  testedAt: Date;
}

export interface GetTenantPaymentConfigsServiceInput {
  effectiveTenant: EffectiveTenant;
}
export interface GetTenantPaymentConfigsServiceResult {
  isCashPaymentEnabled: boolean;
  configs: TenantPaymentConfigSummary[];
  options: TenantPaymentProviderOption[];
}

export interface SaveCashPaymentConfigServiceInput {
  effectiveTenant: EffectiveTenant;
  dto: {
    isEnabled: boolean;
  };
}
export type SaveCashPaymentConfigServiceResult =
  GetTenantPaymentConfigsServiceResult;

export interface SaveTenantPaymentConfigServiceInput {
  effectiveTenant: EffectiveTenant;
  user: UserTokenDto;
  dto: {
    mapperId: string;
    isActive: boolean;
    config: Record<string, unknown>;
  };
}
export type SaveTenantPaymentConfigServiceResult =
  GetTenantPaymentConfigsServiceResult;

export interface FindTenantPaymentOptionsRepoInput {
  marketId: string;
}
export type FindTenantPaymentOptionsRepoResult = TenantPaymentProviderOption[];

export interface FindTenantPaymentOptionRepoInput {
  marketId: string;
  mapperId: string;
}
export type FindTenantPaymentOptionRepoResult =
  TenantPaymentProviderOption | null;

export interface FindTenantPaymentConfigsRepoInput {
  organizationId: string;
  branchId: string;
}
export type FindTenantPaymentConfigsRepoResult = TenantPaymentConfigSummary[];

export interface SaveTenantPaymentConfigRepoInput {
  organizationId: string;
  branchId: string;
  mapperId: string;
  paymentMethod: TenantPaymentMethodEnum;
  isActive: boolean;
  config: TenantPaymentConfigValues;
  userId: string;
}
