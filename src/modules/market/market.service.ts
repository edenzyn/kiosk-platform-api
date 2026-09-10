import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { BranchRepository } from "../branch/branch.repository";
import type { TaxProfileWithComponents } from "../finance/finance.types";
import type { TaxRepository } from "../finance/repositories/tax.repository";
import type { MarketRepository } from "./market.repository";
import type {
  CreateMarketServiceInput,
  CreateMarketServiceResult,
  GetActiveMarketsServiceResult,
  GetMarketWithTaxServiceInput,
  GetMarketWithTaxServiceResult,
  GetPlatformMarketsServiceInput,
  GetPlatformMarketsServiceResult,
  GetResellerMarketsServiceInput,
  GetResellerMarketsServiceResult,
  GetTenantMarketsServiceInput,
  GetTenantMarketsServiceResult,
  MarketWithTaxProfileSummary,
  ResolveMarketIdForEffectiveTenantServiceInput,
  TaxConfigurationDto,
  ToggleMarketStatusServiceInput,
  ToggleMarketStatusServiceResult,
  UpdateMarketServiceInput,
  UpdateMarketServiceResult,
  ValidateOrganizationMarketServiceInput,
  ValidateResellerMarketServiceInput,
} from "./market.types";
import type { MarketEntity } from "./schemas/market.schema";

export class MarketService {
  constructor(
    private readonly marketRepository: MarketRepository,
    private readonly taxRepository: TaxRepository,
    private readonly branchRepository: BranchRepository,
  ) {}

  private async _getTaxProfileWithComponents(
    taxProfileId: string | null,
  ): Promise<TaxProfileWithComponents | null> {
    if (!taxProfileId) return null;

    const taxProfile = await this.taxRepository.findOne({ id: taxProfileId });
    if (!taxProfile) return null;

    const components = await this.taxRepository.findComponentsByProfileId({
      taxProfileId: taxProfile.id,
    });

    return { ...taxProfile, components };
  }

  private async _createOrUpdateTaxProfile(
    taxConfiguration: TaxConfigurationDto,
    existingTaxProfileId: string | null,
    userId: string,
  ): Promise<string> {
    if (existingTaxProfileId) {
      const taxProfile =
        await this.taxRepository.updateTaxProfileWithComponents({
          taxProfileId: existingTaxProfileId,
          name: taxConfiguration.name,
          isTaxInclusive: taxConfiguration.isTaxInclusive,
          components: taxConfiguration.components,
          updatedBy: userId,
        });
      return taxProfile.id;
    }

    const taxProfile = await this.taxRepository.createTaxProfileWithComponents({
      name: taxConfiguration.name,
      isTaxInclusive: taxConfiguration.isTaxInclusive,
      components: taxConfiguration.components,
      createdBy: userId,
    });
    return taxProfile.id;
  }

  private async _attachTaxProfileSummaries(
    markets: MarketEntity[],
  ): Promise<MarketWithTaxProfileSummary[]> {
    const taxProfileIds = [
      ...new Set(
        markets
          .map((market) => market.appTaxProfileId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const taxProfiles = await this.taxRepository.findTaxProfileSummariesByIds({
      taxProfileIds,
    });
    const taxProfilesById = new Map(
      taxProfiles.map((taxProfile) => [taxProfile.id, taxProfile]),
    );

    return markets.map((market) => ({
      ...market,
      taxProfile: market.appTaxProfileId
        ? (taxProfilesById.get(market.appTaxProfileId) ?? null)
        : null,
    }));
  }

  async getMarketWithTax(
    input: GetMarketWithTaxServiceInput,
  ): Promise<GetMarketWithTaxServiceResult> {
    const market = await this.marketRepository.findOne({ id: input.marketId });
    if (!market) {
      throw new AppError("Market not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const taxProfile = await this._getTaxProfileWithComponents(
      market.appTaxProfileId,
    );

    return { ...market, taxProfile };
  }

  async getActiveMarkets(): Promise<GetActiveMarketsServiceResult> {
    const markets = await this.marketRepository.findActive();
    return { markets };
  }

  async resolveMarketIdForEffectiveTenant(
    input: ResolveMarketIdForEffectiveTenantServiceInput,
  ): Promise<string | undefined> {
    if (input.marketId) return input.marketId;
    if (!input.effectiveTenant.branchId) return undefined;

    const branch = await this.branchRepository.findOne({
      id: input.effectiveTenant.branchId,
    });

    if (!branch) {
      throw new AppError("Branch not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }
    return branch.marketId;
  }

  async getTenantMarkets(
    input: GetTenantMarketsServiceInput,
  ): Promise<GetTenantMarketsServiceResult> {
    const { organizationId, branchId } = input.effectiveTenant;

    if (branchId) {
      const branch = await this.branchRepository.findOne({ id: branchId });
      if (!branch) {
        throw new AppError("Branch not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }

      const market = await this.marketRepository.findOne({
        id: branch.marketId,
      });
      if (!market) {
        throw new AppError("Market not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }

      const taxProfile = await this._getTaxProfileWithComponents(
        market.appTaxProfileId,
      );
      return { markets: [{ ...market, taxProfile }] };
    }

    const markets = await this.marketRepository.findMarketsMappedToOrganization(
      { organizationId },
    );

    const marketsWithTax = await Promise.all(
      markets.map(async (market) => {
        const taxProfile = await this._getTaxProfileWithComponents(
          market.appTaxProfileId,
        );
        return { ...market, taxProfile };
      }),
    );

    return { markets: marketsWithTax };
  }

  async getResellerMarkets(
    input: GetResellerMarketsServiceInput,
  ): Promise<GetResellerMarketsServiceResult> {
    const markets = await this.marketRepository.findMarketsMappedToReseller({
      resellerId: input.resellerId,
    });

    const marketsWithTax = await Promise.all(
      markets.map(async (market) => {
        const taxProfile = await this._getTaxProfileWithComponents(
          market.appTaxProfileId,
        );
        return { ...market, taxProfile };
      }),
    );

    return { markets: marketsWithTax };
  }

  async validateOrganizationMarket(
    input: ValidateOrganizationMarketServiceInput,
  ): Promise<void> {
    const isMapped = await this.marketRepository.isOrganizationMappedToMarket({
      organizationId: input.organizationId,
      marketId: input.marketId,
    });
    if (!isMapped) {
      throw new AppError("This market is not available for your organization", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
  }

  async validateResellerMarket(
    input: ValidateResellerMarketServiceInput,
  ): Promise<void> {
    const isMapped = await this.marketRepository.isResellerMappedToMarket({
      resellerId: input.resellerId,
      marketId: input.marketId,
    });
    if (!isMapped) {
      throw new AppError("This market is not available for you", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
  }

  private async _checkCountryCodeExists(countryCode: string): Promise<void> {
    const existing = await this.marketRepository.findOneByCountryCode({
      countryCode,
    });
    if (existing) {
      throw new AppError(
        `A market for country code ${countryCode} already exists`,
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
        },
      );
    }
  }

  async getPlatformMarkets(
    input: GetPlatformMarketsServiceInput,
  ): Promise<GetPlatformMarketsServiceResult> {
    const { page, limit, search, isActive, sortBy, sortOrder } = input.query;

    const { markets, total } = await this.marketRepository.findPaginated({
      page,
      limit,
      search,
      isActive,
      sortBy,
      sortOrder,
    });

    return {
      markets: await this._attachTaxProfileSummaries(markets),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createMarket(
    input: CreateMarketServiceInput,
  ): Promise<CreateMarketServiceResult> {
    await this._checkCountryCodeExists(input.dto.countryCode);

    const appTaxProfileId = await this._createOrUpdateTaxProfile(
      input.dto.taxConfiguration,
      null,
      input.currentUser.id,
    );

    const market = await this.marketRepository.create({
      countryCode: input.dto.countryCode,
      name: input.dto.name,
      currencyCode: input.dto.currencyCode,
      appTaxProfileId,
      createdBy: input.currentUser.id,
    });

    const taxProfile = await this._getTaxProfileWithComponents(appTaxProfileId);
    return { market: { ...market, taxProfile } };
  }

  async updateMarket(
    input: UpdateMarketServiceInput,
  ): Promise<UpdateMarketServiceResult> {
    const existing = await this.marketRepository.findOne({
      id: input.marketId,
    });
    if (!existing) {
      throw new AppError("Market not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const appTaxProfileId = await this._createOrUpdateTaxProfile(
      input.dto.taxConfiguration,
      existing.appTaxProfileId,
      input.currentUser.id,
    );

    const market = await this.marketRepository.update({
      marketId: input.marketId,
      updatedBy: input.currentUser.id,
      data: {
        name: input.dto.name,
        appTaxProfileId,
      },
    });

    const taxProfile = await this._getTaxProfileWithComponents(appTaxProfileId);
    return { market: { ...market, taxProfile } };
  }

  async toggleMarketStatus(
    input: ToggleMarketStatusServiceInput,
  ): Promise<ToggleMarketStatusServiceResult> {
    const existing = await this.marketRepository.findOne({
      id: input.marketId,
    });
    if (!existing) {
      throw new AppError("Market not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const market = await this.marketRepository.update({
      marketId: input.marketId,
      updatedBy: input.currentUser.id,
      data: { isActive: !existing.isActive },
    });

    return { market };
  }
}
