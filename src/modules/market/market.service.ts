import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MarketRepository } from "./market.repository";
import type {
  CreateMarketServiceInput,
  CreateMarketServiceResult,
  GetActiveMarketsServiceResult,
  GetMarketByIdServiceInput,
  GetMarketByIdServiceResult,
  GetPlatformMarketsServiceInput,
  GetPlatformMarketsServiceResult,
  ToggleMarketStatusServiceInput,
  ToggleMarketStatusServiceResult,
  UpdateMarketServiceInput,
  UpdateMarketServiceResult,
  ValidateMarketIdsServiceInput,
  ValidateOrganizationMarketServiceInput,
  ValidateResellerMarketServiceInput,
} from "./market.types";

export class MarketService {
  constructor(private readonly marketRepository: MarketRepository) {}

  async getMarketById(
    input: GetMarketByIdServiceInput,
  ): Promise<GetMarketByIdServiceResult> {
    const market = await this.marketRepository.findOne({ id: input.marketId });
    if (!market) {
      throw new AppError("Market not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }
    return market;
  }

  async getActiveMarkets(): Promise<GetActiveMarketsServiceResult> {
    const markets = await this.marketRepository.findActive();
    return { markets };
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

  async validateMarketIds(input: ValidateMarketIdsServiceInput): Promise<void> {
    if (input.marketIds.length === 0) return;

    const found = await this.marketRepository.findManyByIds({
      ids: input.marketIds,
    });

    if (found.length !== input.marketIds.length) {
      throw new AppError("One or more selected markets do not exist", {
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
      markets,
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

    const market = await this.marketRepository.create({
      countryCode: input.dto.countryCode,
      name: input.dto.name,
      currencyCode: input.dto.currencyCode,
      createdBy: input.currentUser.id,
    });

    return { market };
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

    const market = await this.marketRepository.update({
      marketId: input.marketId,
      updatedBy: input.currentUser.id,
      data: { name: input.dto.name },
    });

    return { market };
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
