import { and, asc, count, desc, eq, ilike, ne, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { branches } from "../branch/schemas/branch.schema";
import type {
  CreateMarketRepoInput,
  CreateMarketRepoResult,
  FindActiveMarketsRepoResult,
  FindMarketByBranchRepoInput,
  FindMarketByBranchRepoResult,
  FindMarketsMappedToOrganizationRepoInput,
  FindMarketsMappedToOrganizationRepoResult,
  FindMarketsMappedToResellerRepoInput,
  FindMarketsMappedToResellerRepoResult,
  FindOneByCountryCodeRepoInput,
  FindOneByCountryCodeRepoResult,
  FindOneMarketRepoInput,
  FindOneMarketRepoResult,
  FindPaginatedMarketsRepoInput,
  FindPaginatedMarketsRepoResult,
  IsOrganizationMappedToMarketRepoInput,
  IsOrganizationMappedToMarketRepoResult,
  IsResellerMappedToMarketRepoInput,
  IsResellerMappedToMarketRepoResult,
  MapResellerToMarketsRepoInput,
  UpdateMarketRepoInput,
  UpdateMarketRepoResult,
} from "./market.types";
import { markets } from "./schemas/market.schema";
import { organizationMarketMapper } from "./schemas/organization-market-mapper.schema";
import { resellerMarketMapper } from "./schemas/reseller-market-mapper.schema";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { logger } from "../../shared/utils/core/logger";

export class MarketRepository {
  constructor(private readonly database: Database) {}

  async findOne(
    input: FindOneMarketRepoInput,
  ): Promise<FindOneMarketRepoResult> {
    try {
      const [market] = await this.database.client
        .select()
        .from(markets)
        .where(eq(markets.id, input.id))
        .limit(1);

      return (await market) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_ONE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findActive(): Promise<FindActiveMarketsRepoResult> {
    try {
      return await this.database.client
        .select({
          id: markets.id,
          countryCode: markets.countryCode,
          name: markets.name,
          currencyCode: markets.currencyCode,
        })
        .from(markets)
        .where(eq(markets.isActive, true));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_ACTIVE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findMarketsMappedToOrganization(
    input: FindMarketsMappedToOrganizationRepoInput,
  ): Promise<FindMarketsMappedToOrganizationRepoResult> {
    try {
      const rows = await this.database.client
        .select({ market: markets })
        .from(organizationMarketMapper)
        .innerJoin(markets, eq(organizationMarketMapper.marketId, markets.id))
        .where(
          and(
            eq(organizationMarketMapper.organizationId, input.organizationId),
            eq(organizationMarketMapper.isActive, true),
            eq(markets.isActive, true),
          ),
        );

      return await rows.map((row) => row.market);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        "[MARKET_FIND_MARKETS_MAPPED_TO_ORGANIZATION_ERROR] " + error,
      );
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findMarketByBranch(
    input: FindMarketByBranchRepoInput,
  ): Promise<FindMarketByBranchRepoResult> {
    try {
      const [row] = await this.database.client
        .select({ market: markets })
        .from(branches)
        .innerJoin(markets, eq(branches.marketId, markets.id))
        .where(eq(branches.id, input.branchId))
        .limit(1);

      return (await row?.market) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_MARKET_BY_BRANCH_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findMarketsMappedToReseller(
    input: FindMarketsMappedToResellerRepoInput,
  ): Promise<FindMarketsMappedToResellerRepoResult> {
    try {
      const rows = await this.database.client
        .select({ market: markets })
        .from(resellerMarketMapper)
        .innerJoin(markets, eq(resellerMarketMapper.marketId, markets.id))
        .where(
          and(
            eq(resellerMarketMapper.resellerId, input.resellerId),
            eq(resellerMarketMapper.isActive, true),
            eq(markets.isActive, true),
          ),
        );

      return await rows.map((row) => row.market);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_MARKETS_MAPPED_TO_RESELLER_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async isOrganizationMappedToMarket(
    input: IsOrganizationMappedToMarketRepoInput,
  ): Promise<IsOrganizationMappedToMarketRepoResult> {
    try {
      const [mapping] = await this.database.client
        .select({ id: organizationMarketMapper.id })
        .from(organizationMarketMapper)
        .where(
          and(
            eq(organizationMarketMapper.organizationId, input.organizationId),
            eq(organizationMarketMapper.marketId, input.marketId),
            eq(organizationMarketMapper.isActive, true),
          ),
        )
        .limit(1);

      return await !!mapping;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_IS_ORGANIZATION_MAPPED_TO_MARKET_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async isResellerMappedToMarket(
    input: IsResellerMappedToMarketRepoInput,
  ): Promise<IsResellerMappedToMarketRepoResult> {
    try {
      const [mapping] = await this.database.client
        .select({ id: resellerMarketMapper.id })
        .from(resellerMarketMapper)
        .where(
          and(
            eq(resellerMarketMapper.resellerId, input.resellerId),
            eq(resellerMarketMapper.marketId, input.marketId),
            eq(resellerMarketMapper.isActive, true),
          ),
        )
        .limit(1);

      return await !!mapping;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_IS_RESELLER_MAPPED_TO_MARKET_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async mapResellerToMarkets(
    input: MapResellerToMarketsRepoInput,
  ): Promise<void> {
    try {
      if (input.marketIds.length === 0) return;

      await this.database.client.insert(resellerMarketMapper).values(
        input.marketIds.map((marketId) => ({
          resellerId: input.resellerId,
          marketId,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })),
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_MAP_RESELLER_TO_MARKETS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findOneByCountryCode(
    input: FindOneByCountryCodeRepoInput,
  ): Promise<FindOneByCountryCodeRepoResult> {
    try {
      const conditions: SQL[] = [eq(markets.countryCode, input.countryCode)];
      if (input.excludeId) {
        conditions.push(ne(markets.id, input.excludeId));
      }

      const [market] = await this.database.client
        .select()
        .from(markets)
        .where(and(...conditions))
        .limit(1);

      return (await market) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_ONE_BY_COUNTRY_CODE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findPaginated(
    input: FindPaginatedMarketsRepoInput,
  ): Promise<FindPaginatedMarketsRepoResult> {
    try {
      const { search, isActive, page, limit, sortBy, sortOrder } = input;

      const conditions: SQL[] = [];
      if (isActive !== undefined) {
        conditions.push(eq(markets.isActive, isActive));
      }
      if (search) {
        conditions.push(ilike(markets.name, `%${search}%`));
      }
      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.database.client
        .select({ count: count() })
        .from(markets)
        .where(condition);
      const total = Number(countResult?.count || 0);

      let query = this.database.client
        .select()
        .from(markets)
        .where(condition)
        .$dynamic();

      if (sortBy && sortOrder) {
        const orderFn = sortOrder === "asc" ? asc : desc;
        if (sortBy === "name") {
          query = query.orderBy(orderFn(markets.name));
        } else if (sortBy === "countryCode") {
          query = query.orderBy(orderFn(markets.countryCode));
        } else if (sortBy === "isActive") {
          query = query.orderBy(orderFn(markets.isActive));
        } else if (sortBy === "createdAt") {
          query = query.orderBy(orderFn(markets.createdAt));
        }
      } else {
        query = query.orderBy(desc(markets.createdAt));
      }

      const rows = await query.limit(limit).offset((page - 1) * limit);

      return await { markets: rows, total };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_FIND_PAGINATED_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async create(input: CreateMarketRepoInput): Promise<CreateMarketRepoResult> {
    try {
      const [market] = await this.database.client
        .insert(markets)
        .values({
          countryCode: input.countryCode,
          name: input.name,
          currencyCode: input.currencyCode,
          appTaxProfileId: input.appTaxProfileId,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      if (!market) throw new Error("Failed to create market");
      return await market;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_CREATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async update(input: UpdateMarketRepoInput): Promise<UpdateMarketRepoResult> {
    try {
      const [market] = await this.database.client
        .update(markets)
        .set({
          ...input.data,
          updatedBy: input.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(markets.id, input.marketId))
        .returning();

      if (!market) throw new Error("Failed to update market");
      return await market;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[MARKET_UPDATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
