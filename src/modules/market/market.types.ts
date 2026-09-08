import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { MarketEntity } from "./schemas/market.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetActiveMarketsServiceResult {
  markets: MarketEntity[];
}

export interface GetMarketByIdServiceInput {
  marketId: string;
}
export type GetMarketByIdServiceResult = MarketEntity;

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

export interface GetPlatformMarketsServiceResult {
  markets: MarketEntity[];
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
  };
  currentUser: UserTokenDto;
}
export interface CreateMarketServiceResult {
  market: MarketEntity;
}

export interface UpdateMarketServiceInput {
  marketId: string;
  dto: {
    name: string;
  };
  currentUser: UserTokenDto;
}
export interface UpdateMarketServiceResult {
  market: MarketEntity;
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

export type FindActiveMarketsRepoResult = MarketEntity[];

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
    isActive: boolean;
  }>;
}
export type UpdateMarketRepoResult = MarketEntity;
