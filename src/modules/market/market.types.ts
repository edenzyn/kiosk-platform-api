import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type {
  CreateTaxComponentDto,
  TaxProfileWithComponents,
} from "../finance/finance.types";
import type { MarketEntity } from "./schemas/market.schema";

export interface ActiveMarketEntity {
  id: string;
  countryCode: string;
  name: string;
  currencyCode: string;
}

export interface TaxConfigurationDto {
  name: string;
  isTaxInclusive: boolean;
  components: CreateTaxComponentDto[];
}

export type MarketWithTaxProfile = MarketEntity & {
  taxProfile: TaxProfileWithComponents | null;
};

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetActiveMarketsServiceResult {
  markets: ActiveMarketEntity[];
}

export interface GetTenantMarketsServiceInput {
  effectiveTenant: EffectiveTenant;
}
export interface GetTenantMarketsServiceResult {
  markets: MarketWithTaxProfile[];
}

export interface GetResellerMarketsServiceInput {
  resellerId: string;
}
export interface GetResellerMarketsServiceResult {
  markets: MarketWithTaxProfile[];
}

export interface ResolveMarketIdForEffectiveTenantServiceInput {
  effectiveTenant: EffectiveTenant;
  marketId?: string;
}

export interface GetMarketWithTaxServiceInput {
  marketId: string;
}
export type GetMarketWithTaxServiceResult = MarketWithTaxProfile;

export interface ValidateOrganizationMarketServiceInput {
  organizationId: string;
  marketId: string;
}

export interface ValidateResellerMarketServiceInput {
  resellerId: string;
  marketId: string;
}

export interface GetPlatformMarketsServiceInput {
  query: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

export type MarketWithTaxProfileSummary = MarketEntity & {
  taxProfile: { id: string; name: string } | null;
};

export interface GetPlatformMarketsServiceResult {
  markets: MarketWithTaxProfileSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateMarketServiceInput {
  dto: {
    countryCode: string;
    name: string;
    currencyCode: string;
    taxConfiguration: TaxConfigurationDto;
  };
  currentUser: UserTokenDto;
}
export interface CreateMarketServiceResult {
  market: MarketWithTaxProfile;
}

export interface UpdateMarketServiceInput {
  marketId: string;
  dto: {
    name: string;
    taxConfiguration: TaxConfigurationDto;
  };
  currentUser: UserTokenDto;
}
export interface UpdateMarketServiceResult {
  market: MarketWithTaxProfile;
}

export interface ToggleMarketStatusServiceInput {
  marketId: string;
  currentUser: UserTokenDto;
}
export interface ToggleMarketStatusServiceResult {
  market: MarketEntity;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneMarketRepoInput {
  id: string;
}
export type FindOneMarketRepoResult = MarketEntity | null;

export type FindActiveMarketsRepoResult = ActiveMarketEntity[];

export interface FindMarketsMappedToOrganizationRepoInput {
  organizationId: string;
}
export type FindMarketsMappedToOrganizationRepoResult = MarketEntity[];

export interface FindMarketsMappedToResellerRepoInput {
  resellerId: string;
}
export type FindMarketsMappedToResellerRepoResult = MarketEntity[];

export interface IsOrganizationMappedToMarketRepoInput {
  organizationId: string;
  marketId: string;
}
export type IsOrganizationMappedToMarketRepoResult = boolean;

export interface IsResellerMappedToMarketRepoInput {
  resellerId: string;
  marketId: string;
}
export type IsResellerMappedToMarketRepoResult = boolean;

export interface MapResellerToMarketsRepoInput {
  resellerId: string;
  marketIds: string[];
  createdBy: string;
}

export interface FindPaginatedMarketsRepoInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface FindPaginatedMarketsRepoResult {
  markets: MarketEntity[];
  total: number;
}

export interface FindOneByCountryCodeRepoInput {
  countryCode: string;
  excludeId?: string;
}
export type FindOneByCountryCodeRepoResult = MarketEntity | null;

export interface CreateMarketRepoInput {
  countryCode: string;
  name: string;
  currencyCode: string;
  appTaxProfileId?: string | null;
  createdBy: string;
}
export type CreateMarketRepoResult = MarketEntity;

export interface UpdateMarketRepoInput {
  marketId: string;
  updatedBy: string;
  data: Partial<{
    countryCode: string;
    name: string;
    currencyCode: string;
    appTaxProfileId: string | null;
    isActive: boolean;
  }>;
}
export type UpdateMarketRepoResult = MarketEntity;
