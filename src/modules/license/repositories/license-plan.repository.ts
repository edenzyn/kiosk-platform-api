import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  notInArray,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../../config/db";
import { licensePlanMarketMapper } from "../../market/schemas/license-plan-market-mapper.schema";
import { markets } from "../../market/schemas/market.schema";
import type {
  CreateLicensePlanRepoInput,
  CreateLicensePlanRepoResult,
  FindLicensePlansPaginatedRepoInput,
  FindLicensePlansPaginatedRepoResult,
  FindLicensePlansRepoInput,
  FindLicensePlansRepoResult,
  FindOneLicensePlanRepoInput,
  FindOneLicensePlanRepoResult,
  LicensePlanWithMarketPrices,
  LicensePlanWithPrice,
  UpdateLicensePlanRepoInput,
  UpdateLicensePlanRepoResult,
} from "../license.types";
import {
  licensePlans,
  type LicensePlanEntity,
} from "../schemas/license-plan.schema";
import { AppError } from "../../../shared/errors/app-error";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { logger } from "../../../shared/utils/core/logger";

type QueryExecutor =
  | Database["client"]
  | Parameters<Parameters<Database["client"]["transaction"]>[0]>[0];

export class LicensePlanRepository {
  constructor(private readonly database: Database) {}

  private async _attachMarketPrices(
    plans: LicensePlanEntity[],
    executor: QueryExecutor = this.database.client,
  ): Promise<LicensePlanWithMarketPrices[]> {
    try {
      if (plans.length === 0) return await [];

      const rows = await executor
        .select({
          planId: licensePlanMarketMapper.planId,
          marketId: licensePlanMarketMapper.marketId,
          marketName: markets.name,
          currencyCode: markets.currencyCode,
          price: licensePlanMarketMapper.price,
        })
        .from(licensePlanMarketMapper)
        .innerJoin(markets, eq(licensePlanMarketMapper.marketId, markets.id))
        .where(
          and(
            inArray(
              licensePlanMarketMapper.planId,
              plans.map((plan) => plan.id),
            ),
            eq(licensePlanMarketMapper.isActive, true),
          ),
        );

      const pricesByPlanId = new Map<
        string,
        LicensePlanWithMarketPrices["marketPrices"]
      >();
      for (const row of rows) {
        const existing = pricesByPlanId.get(row.planId) ?? [];
        existing.push({
          marketId: row.marketId,
          marketName: row.marketName,
          currencyCode: row.currencyCode,
          price: row.price,
        });
        pricesByPlanId.set(row.planId, existing);
      }

      return await plans.map((plan) => ({
        ...plan,
        marketPrices: pricesByPlanId.get(plan.id) ?? [],
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN__ATTACH_MARKET_PRICES_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  private async _attachSingleMarketPrice(
    plans: LicensePlanEntity[],
    marketId: string,
  ): Promise<LicensePlanWithPrice[]> {
    try {
      if (plans.length === 0) return await [];

      const rows = await this.database.client
        .select({
          planId: licensePlanMarketMapper.planId,
          marketId: licensePlanMarketMapper.marketId,
          currencyCode: markets.currencyCode,
          price: licensePlanMarketMapper.price,
        })
        .from(licensePlanMarketMapper)
        .innerJoin(markets, eq(licensePlanMarketMapper.marketId, markets.id))
        .where(
          and(
            inArray(
              licensePlanMarketMapper.planId,
              plans.map((plan) => plan.id),
            ),
            eq(licensePlanMarketMapper.marketId, marketId),
            eq(licensePlanMarketMapper.isActive, true),
          ),
        );

      const priceByPlanId = new Map(rows.map((row) => [row.planId, row]));

      return await plans
        .filter((plan) => priceByPlanId.has(plan.id))
        .map((plan) => {
          const row = priceByPlanId.get(plan.id);
          return {
            ...plan,
            price: row?.price ?? null,
            marketId: row?.marketId ?? null,
            currencyCode: row?.currencyCode ?? null,
          };
        });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN__ATTACH_SINGLE_MARKET_PRICE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLicensePlans(
    input: FindLicensePlansRepoInput,
  ): Promise<FindLicensePlansRepoResult> {
    try {
      const conditions: SQL[] = [];

      if (input.id) {
        conditions.push(eq(licensePlans.id, input.id));
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(licensePlans.isActive, input.isActive));
      }

      const plans = await this.database.client
        .select()
        .from(licensePlans)
        .where(and(...conditions))
        .orderBy(asc(licensePlans.durationDays));

      if (input.marketId) {
        return await this._attachSingleMarketPrice(plans, input.marketId);
      }

      // No market context: fall back to plan rows without a per-market price
      // attached (caller should not treat these as purchasable).
      return await plans.map((plan) => ({
        ...plan,
        price: null,
        marketId: null,
        currencyCode: null,
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN_FIND_LICENSE_PLANS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLicensePlansWithMarketPrices(
    input: FindLicensePlansRepoInput,
  ): Promise<LicensePlanWithMarketPrices[]> {
    try {
      const conditions: SQL[] = [];

      if (input.id) {
        conditions.push(eq(licensePlans.id, input.id));
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(licensePlans.isActive, input.isActive));
      }

      const plans = await this.database.client
        .select()
        .from(licensePlans)
        .where(and(...conditions))
        .orderBy(asc(licensePlans.durationDays));

      return await this._attachMarketPrices(plans);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        "[LICENSE_PLAN_FIND_LICENSE_PLANS_WITH_MARKET_PRICES_ERROR] " + error,
      );
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLicensePlansPaginated(
    input: FindLicensePlansPaginatedRepoInput,
  ): Promise<FindLicensePlansPaginatedRepoResult> {
    try {
      const { search, isActive, page, limit, marketId } = input;

      const conditions: (SQL | undefined)[] = [];
      if (isActive !== undefined) {
        conditions.push(eq(licensePlans.isActive, isActive));
      }
      if (search) {
        conditions.push(ilike(licensePlans.name, `%${search}%`));
      }
      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.database.client
        .select({ count: count() })
        .from(licensePlans)
        .where(condition);
      const total = Number(countResult?.count || 0);

      const plans = await this.database.client
        .select()
        .from(licensePlans)
        .where(condition)
        .orderBy(asc(licensePlans.durationDays))
        .limit(limit)
        .offset((page - 1) * limit);

      if (marketId) {
        return await {
          plans: await this._attachSingleMarketPrice(plans, marketId),
          total,
        };
      }

      return await {
        plans: await this._attachMarketPrices(plans),
        total,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        "[LICENSE_PLAN_FIND_LICENSE_PLANS_PAGINATED_ERROR] " + error,
      );
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async createLicensePlan(
    input: CreateLicensePlanRepoInput,
  ): Promise<CreateLicensePlanRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const [plan] = await tx
          .insert(licensePlans)
          .values({
            name: input.name,
            deviceType: input.deviceType,
            durationDays: input.durationDays,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })
          .returning();

        if (!plan) throw new Error("Failed to create license plan");

        if (input.marketPrices.length > 0) {
          await tx.insert(licensePlanMarketMapper).values(
            input.marketPrices.map((marketPrice) => ({
              planId: plan.id,
              marketId: marketPrice.marketId,
              price: String(marketPrice.price),
              createdBy: input.createdBy,
              updatedBy: input.createdBy,
            })),
          );
        }

        const [withPrices] = await this._attachMarketPrices([plan], tx);
        if (!withPrices) throw new Error("Failed to create license plan");
        return withPrices;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN_CREATE_LICENSE_PLAN_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLicensePlan(
    input: FindOneLicensePlanRepoInput,
  ): Promise<FindOneLicensePlanRepoResult> {
    try {
      const [plan] = await this.database.client
        .select()
        .from(licensePlans)
        .where(eq(licensePlans.id, input.id))
        .limit(1);

      return (await plan) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN_FIND_LICENSE_PLAN_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async updateLicensePlan(
    input: UpdateLicensePlanRepoInput,
  ): Promise<UpdateLicensePlanRepoResult> {
    try {
      const { marketPrices, ...planFields } = input.data;

      return await this.database.client.transaction(async (tx) => {
        const [updated] = await tx
          .update(licensePlans)
          .set({
            ...planFields,
            updatedBy: input.updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(licensePlans.id, input.id))
          .returning();

        if (!updated) throw new Error("License plan not found");

        if (marketPrices !== undefined) {
          const keepMarketIds = marketPrices.map((mp) => mp.marketId);

          if (keepMarketIds.length > 0) {
            await tx
              .delete(licensePlanMarketMapper)
              .where(
                and(
                  eq(licensePlanMarketMapper.planId, updated.id),
                  notInArray(licensePlanMarketMapper.marketId, keepMarketIds),
                ),
              );
          } else {
            await tx
              .delete(licensePlanMarketMapper)
              .where(eq(licensePlanMarketMapper.planId, updated.id));
          }

          for (const marketPrice of marketPrices) {
            await tx
              .insert(licensePlanMarketMapper)
              .values({
                planId: updated.id,
                marketId: marketPrice.marketId,
                price: String(marketPrice.price),
                createdBy: input.updatedBy,
                updatedBy: input.updatedBy,
              })
              .onConflictDoUpdate({
                target: [
                  licensePlanMarketMapper.marketId,
                  licensePlanMarketMapper.planId,
                ],
                set: {
                  price: String(marketPrice.price),
                  updatedBy: input.updatedBy,
                  updatedAt: new Date(),
                },
              });
          }
        }

        const [withPrices] = await this._attachMarketPrices([updated], tx);
        if (!withPrices) throw new Error("License plan not found");
        return withPrices;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_PLAN_UPDATE_LICENSE_PLAN_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
