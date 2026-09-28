import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
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
export interface CreatePaymentProviderServiceInput {
  dto: {
    name: string;
    slug: string;
    mappings: CreatePaymentProviderMappingDto[];
  };
  currentUser: UserTokenDto;
}

export interface UpdatePaymentProviderServiceInput {
  providerId: string;
  dto: {
    name: string;
    mappings: UpdatePaymentProviderMappingDto[];
  };
  currentUser: UserTokenDto;
}

export interface TogglePaymentProviderStatusServiceInput {
  providerId: string;
  currentUser: UserTokenDto;
}

export interface GetPaymentProvidersServiceResult {
  providers: PaymentProviderWithMappings[];
}

export interface PaymentProviderServiceResult {
  provider: PaymentProviderWithMappings;
}

// ========================================
// ? PLATFORM PAYMENT PROVIDER — REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOnePaymentProviderRepoInput {
  id: string;
}
export type FindOnePaymentProviderRepoResult = PaymentProviderEntity | null;

export interface FindOnePaymentProviderBySlugRepoInput {
  slug: string;
}
export type FindOnePaymentProviderBySlugRepoResult =
  PaymentProviderEntity | null;

export interface FindOnePaymentProviderWithMappingsRepoInput {
  id: string;
}
export type FindOnePaymentProviderWithMappingsRepoResult =
  PaymentProviderWithMappings | null;

export type FindAllPaymentProvidersWithMappingsRepoResult =
  PaymentProviderWithMappings[];

export interface CreatePaymentProviderWithMappingsRepoInput {
  name: string;
  slug: string;
  mappings: CreatePaymentProviderMappingDto[];
  createdBy: string;
}
export type CreatePaymentProviderWithMappingsRepoResult =
  PaymentProviderEntity;

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
  name: string;
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
