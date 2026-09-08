import { and, asc, count, desc, eq, ilike, ne, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { organizationMarketMapper } from "./schemas/organization-market-mapper.schema";
import { resellerMarketMapper } from "./schemas/reseller-market-mapper.schema";
import { markets } from "./schemas/market.schema";
import type {
  CreateMarketRepoInput,
  CreateMarketRepoResult,
  FindActiveMarketsRepoResult,
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

export class MarketRepository {
  constructor(private readonly database: Database) {}

  async findOne(input: FindOneMarketRepoInput): Promise<FindOneMarketRepoResult> {
    const [market] = await this.database.client
      .select()
      .from(markets)
      .where(eq(markets.id, input.id))
      .limit(1);

    return market ?? null;
  }

  async findActive(): Promise<FindActiveMarketsRepoResult> {
    return this.database.client
      .select({
        id: markets.id,
        countryCode: markets.countryCode,
        name: markets.name,
        currencyCode: markets.currencyCode,
      })
      .from(markets)
      .where(eq(markets.isActive, true));
  }

  async isOrganizationMappedToMarket(
    input: IsOrganizationMappedToMarketRepoInput,
  ): Promise<IsOrganizationMappedToMarketRepoResult> {
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

    return !!mapping;
  }

  async isResellerMappedToMarket(
    input: IsResellerMappedToMarketRepoInput,
  ): Promise<IsResellerMappedToMarketRepoResult> {
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

    return !!mapping;
  }

  async mapResellerToMarkets(input: MapResellerToMarketsRepoInput): Promise<void> {
    if (input.marketIds.length === 0) return;

    await this.database.client.insert(resellerMarketMapper).values(
      input.marketIds.map((marketId) => ({
        resellerId: input.resellerId,
        marketId,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })),
    );
  }

  async findOneByCountryCode(
    input: FindOneByCountryCodeRepoInput,
  ): Promise<FindOneByCountryCodeRepoResult> {
    const conditions: SQL[] = [eq(markets.countryCode, input.countryCode)];
    if (input.excludeId) {
      conditions.push(ne(markets.id, input.excludeId));
    }

    const [market] = await this.database.client
      .select()
      .from(markets)
      .where(and(...conditions))
      .limit(1);

    return market ?? null;
  }

  async findPaginated(
    input: FindPaginatedMarketsRepoInput,
  ): Promise<FindPaginatedMarketsRepoResult> {
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

    return { markets: rows, total };
  }

  async create(input: CreateMarketRepoInput): Promise<CreateMarketRepoResult> {
    const [market] = await this.database.client
      .insert(markets)
      .values({
        countryCode: input.countryCode,
        name: input.name,
        currencyCode: input.currencyCode,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();

    if (!market) throw new Error("Failed to create market");
    return market;
  }

  async update(input: UpdateMarketRepoInput): Promise<UpdateMarketRepoResult> {
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
    return market;
  }
}
