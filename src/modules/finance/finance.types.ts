import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type {
  CreateTenantTaxProfileBodyDto,
  TenantTaxComponentBodyDto,
  UpdateTenantTaxProfileBodyDto,
  UpdateTenantTaxProfileStatusBodyDto,
} from "./dtos/tenant-tax-profile.dtos";
import type { AppTaxComponentEntity } from "./schemas/app-tax-component.schema";
import type { AppTaxProfileEntity } from "./schemas/app-tax-profile.schema";
import type { TenantTaxComponentEntity } from "./schemas/tenant-tax-component.schema";
import type { TenantTaxProfileEntity } from "./schemas/tenant-tax-profile.schema";

// ========================================
// ? TENANT TAX TYPES
// ========================================
export interface TenantTaxProfileWithComponents extends TenantTaxProfileEntity {
  components: TenantTaxComponentEntity[];
}

export interface TenantTaxComponentRepoInput extends TenantTaxComponentBodyDto {
  rate: number;
}

export interface FindTenantTaxProfilesRepoInput {
  organizationId: string;
  branchId: string;
}

export interface FindOneTenantTaxProfileRepoInput {
  id: string;
  organizationId: string;
  branchId: string;
}

export interface CreateTenantTaxProfileRepoInput {
  data: {
    organizationId: string;
    branchId: string;
    name: string;
    isTaxInclusive: boolean;
    components: TenantTaxComponentRepoInput[];
    createdBy: string;
  };
}

export interface UpdateTenantTaxProfileRepoInput {
  data: {
    id: string;
    organizationId: string;
    branchId: string;
    name: string;
    isTaxInclusive: boolean;
    components: TenantTaxComponentRepoInput[];
    updatedBy: string;
  };
}

export interface UpdateTenantTaxProfileStatusRepoInput {
  data: {
    id: string;
    organizationId: string;
    branchId: string;
    isActive: boolean;
    updatedBy: string;
  };
}

export interface GetTenantTaxProfilesServiceInput {
  effectiveTenant: EffectiveTenant;
}

export interface CreateTenantTaxProfileServiceInput {
  data: CreateTenantTaxProfileBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export interface UpdateTenantTaxProfileServiceInput {
  data: UpdateTenantTaxProfileBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export interface UpdateTenantTaxProfileStatusServiceInput {
  data: UpdateTenantTaxProfileStatusBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

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
// ? TAX — SHARED TYPES
// ========================================
// Tax configuration is embedded in the Market create/update/get APIs
// (MarketService), not exposed as standalone tax-profile endpoints.
export type TaxProfileWithComponents = AppTaxProfileEntity & {
  components: AppTaxComponentEntity[];
};

export interface CreateTaxComponentDto {
  id?: string;
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

export interface FindTaxProfileSummariesByIdsRepoInput {
  taxProfileIds: string[];
}
export type FindTaxProfileSummariesByIdsRepoResult = Array<{
  id: string;
  name: string;
}>;

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
  deletedComponentIds: string[];
  updatedBy: string;
}
export type UpdateTaxProfileRepoResult = AppTaxProfileEntity;
