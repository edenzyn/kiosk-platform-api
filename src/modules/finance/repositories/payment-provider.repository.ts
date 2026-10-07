import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Database } from "../../../config/db";
import { markets } from "../../market/schemas/market.schema";
import { paymentProviderMarketMappers } from "../schemas/payment-provider-market-mapper.schema";
import { paymentProviders } from "../schemas/payment-provider.schema";
import { tenantPaymentConfigs } from "../schemas/tenant-payment-config.schema";
import type {
  FindOnePaymentProviderRepoInput,
  FindOnePaymentProviderRepoResult,
  FindOnePaymentProviderWithMappingsRepoInput,
  FindOnePaymentProviderWithMappingsRepoResult,
  FindPaginatedPaymentProvidersRepoInput,
  FindPaginatedPaymentProvidersRepoResult,
  FindTenantPaymentConfigsRepoInput,
  FindTenantPaymentConfigsRepoResult,
  FindTenantPaymentOptionRepoInput,
  FindTenantPaymentOptionRepoResult,
  FindTenantPaymentOptionsRepoInput,
  FindTenantPaymentOptionsRepoResult,
  PaymentProviderMappingWithMarket,
  SaveTenantPaymentConfigRepoInput,
  UpdatePaymentProviderRepoInput,
  UpdatePaymentProviderRepoResult,
  UpdatePaymentProviderWithMappingsRepoInput,
  UpdatePaymentProviderWithMappingsRepoResult,
} from "../types/payment-provider.types";
import { DatabaseError } from "../../../shared/errors/database-error";
import { logger } from "../../../shared/utils/core/logger";

const SORTABLE_COLUMNS: Record<string, AnyPgColumn> = {
  name: paymentProviders.name,
  slug: paymentProviders.slug,
  createdAt: paymentProviders.createdAt,
};

export class PaymentProviderRepository {
  constructor(private readonly database: Database) {}

  async findPaginatedWithMappings(
    input: FindPaginatedPaymentProvidersRepoInput,
  ): Promise<FindPaginatedPaymentProvidersRepoResult> {
    try {
      const { search, isActive, page, limit, sortBy, sortOrder } = input;

      const conditions: SQL[] = [];
      if (isActive !== undefined) {
        conditions.push(eq(paymentProviders.isActive, isActive));
      }
      if (search) {
        const searchCondition = or(
          ilike(paymentProviders.name, `%${search}%`),
          ilike(paymentProviders.slug, `%${search}%`),
        );
        if (searchCondition) conditions.push(searchCondition);
      }
      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.database.client
        .select({ count: count() })
        .from(paymentProviders)
        .where(condition);
      const total = Number(countResult?.count || 0);

      const sortColumn = sortBy ? SORTABLE_COLUMNS[sortBy] : undefined;
      const orderBy =
        sortColumn && sortOrder
          ? (sortOrder === "asc" ? asc : desc)(sortColumn)
          : desc(paymentProviders.createdAt);

      const providers = await this.database.client
        .select()
        .from(paymentProviders)
        .where(condition)
        .orderBy(orderBy, asc(paymentProviders.id))
        .limit(limit)
        .offset((page - 1) * limit);

      const mappingsByProviderId = await this.findMappingsByProviderIds(
        providers.map((provider) => provider.id),
      );

      return await {
        providers: providers.map((provider) => ({
          ...provider,
          mappings: mappingsByProviderId.get(provider.id) ?? [],
        })),
        total,
      };
    } catch (error) {
      logger.error("[PAYMENT_FIND_PAGINATED_WITH_MAPPINGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findOneWithMappings(
    input: FindOnePaymentProviderWithMappingsRepoInput,
  ): Promise<FindOnePaymentProviderWithMappingsRepoResult> {
    try {
      const provider = await this.findOne({ id: input.id });
      if (!provider) return await null;

      const mappingsByProviderId = await this.findMappingsByProviderIds([
        provider.id,
      ]);

      return await {
        ...provider,
        mappings: mappingsByProviderId.get(provider.id) ?? [],
      };
    } catch (error) {
      logger.error("[PAYMENT_FIND_ONE_WITH_MAPPINGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findOne(
    input: FindOnePaymentProviderRepoInput,
  ): Promise<FindOnePaymentProviderRepoResult> {
    try {
      const [provider] = await this.database.client
        .select()
        .from(paymentProviders)
        .where(eq(paymentProviders.id, input.id))
        .limit(1);

      return (await provider) ?? null;
    } catch (error) {
      logger.error("[PAYMENT_FIND_ONE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async updateWithMappings(
    input: UpdatePaymentProviderWithMappingsRepoInput,
  ): Promise<UpdatePaymentProviderWithMappingsRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const [provider] = await tx
          .update(paymentProviders)
          .set({
            updatedBy: input.updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(paymentProviders.id, input.providerId))
          .returning();

        if (!provider) throw new Error("Failed to update payment provider");

        for (const mapping of input.mappingsToUpdate) {
          await tx
            .update(paymentProviderMarketMappers)
            .set({
              isActive: mapping.isActive,
              updatedBy: input.updatedBy,
              updatedAt: new Date(),
            })
            .where(eq(paymentProviderMarketMappers.id, mapping.id));
        }

        if (input.mappingsToCreate.length > 0) {
          await tx.insert(paymentProviderMarketMappers).values(
            input.mappingsToCreate.map((mapping) => ({
              providerId: provider.id,
              marketId: mapping.marketId,
              paymentMethod: mapping.paymentMethod,
              isActive: mapping.isActive,
              createdBy: input.updatedBy,
              updatedBy: input.updatedBy,
            })),
          );
        }

        return provider;
      });
    } catch (error) {
      logger.error("[PAYMENT_UPDATE_WITH_MAPPINGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async update(
    input: UpdatePaymentProviderRepoInput,
  ): Promise<UpdatePaymentProviderRepoResult> {
    try {
      const [provider] = await this.database.client
        .update(paymentProviders)
        .set({
          ...input.data,
          updatedBy: input.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(paymentProviders.id, input.providerId))
        .returning();

      if (!provider) throw new Error("Failed to update payment provider");
      return await provider;
    } catch (error) {
      logger.error("[PAYMENT_UPDATE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  // ========================================
  // ? TENANT PAYMENT CONFIGS
  // ========================================
  async findTenantPaymentOptions(
    input: FindTenantPaymentOptionsRepoInput,
  ): Promise<FindTenantPaymentOptionsRepoResult> {
    try {
      return await this.database.client
        .select({
          mapperId: paymentProviderMarketMappers.id,
          paymentMethod: paymentProviderMarketMappers.paymentMethod,
          provider: {
            id: paymentProviders.id,
            name: paymentProviders.name,
            slug: paymentProviders.slug,
          },
        })
        .from(paymentProviderMarketMappers)
        .innerJoin(
          paymentProviders,
          eq(paymentProviderMarketMappers.providerId, paymentProviders.id),
        )
        .where(
          and(
            eq(paymentProviderMarketMappers.marketId, input.marketId),
            eq(paymentProviderMarketMappers.isActive, true),
            eq(paymentProviders.isActive, true),
          ),
        )
        .orderBy(asc(paymentProviders.name));
    } catch (error) {
      logger.error("[PAYMENT_FIND_TENANT_PAYMENT_OPTIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findTenantPaymentOption(
    input: FindTenantPaymentOptionRepoInput,
  ): Promise<FindTenantPaymentOptionRepoResult> {
    try {
      const [option] = await this.database.client
        .select({
          mapperId: paymentProviderMarketMappers.id,
          paymentMethod: paymentProviderMarketMappers.paymentMethod,
          provider: {
            id: paymentProviders.id,
            name: paymentProviders.name,
            slug: paymentProviders.slug,
          },
        })
        .from(paymentProviderMarketMappers)
        .innerJoin(
          paymentProviders,
          eq(paymentProviderMarketMappers.providerId, paymentProviders.id),
        )
        .where(
          and(
            eq(paymentProviderMarketMappers.id, input.mapperId),
            eq(paymentProviderMarketMappers.marketId, input.marketId),
            eq(paymentProviderMarketMappers.isActive, true),
            eq(paymentProviders.isActive, true),
          ),
        )
        .limit(1);

      return (await option) ?? null;
    } catch (error) {
      logger.error("[PAYMENT_FIND_TENANT_PAYMENT_OPTION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findTenantPaymentConfigs(
    input: FindTenantPaymentConfigsRepoInput,
  ): Promise<FindTenantPaymentConfigsRepoResult> {
    try {
      return await this.database.client
        .select({
          mapperId: tenantPaymentConfigs.paymentProviderMarketMapperId,
          paymentMethod: paymentProviderMarketMappers.paymentMethod,
          isActive: tenantPaymentConfigs.isActive,
          config: tenantPaymentConfigs.config,
          lastConnectionTest: tenantPaymentConfigs.lastConnectionTest,
        })
        .from(tenantPaymentConfigs)
        .innerJoin(
          paymentProviderMarketMappers,
          eq(
            tenantPaymentConfigs.paymentProviderMarketMapperId,
            paymentProviderMarketMappers.id,
          ),
        )
        .where(
          and(
            eq(tenantPaymentConfigs.organizationId, input.organizationId),
            eq(tenantPaymentConfigs.branchId, input.branchId),
          ),
        );
    } catch (error) {
      logger.error("[PAYMENT_FIND_TENANT_PAYMENT_CONFIGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async saveTenantPaymentConfig(
    input: SaveTenantPaymentConfigRepoInput,
  ): Promise<void> {
    try {
      await this.database.client.transaction(async (tx) => {
        await tx
          .insert(tenantPaymentConfigs)
          .values({
            organizationId: input.organizationId,
            branchId: input.branchId,
            paymentProviderMarketMapperId: input.mapperId,
            config: input.config,
            isActive: input.isActive,
            lastConnectionTest: input.lastConnectionTest,
            createdBy: input.userId,
            updatedBy: input.userId,
          })
          .onConflictDoUpdate({
            target: [
              tenantPaymentConfigs.branchId,
              tenantPaymentConfigs.paymentProviderMarketMapperId,
            ],
            set: {
              config: input.config,
              isActive: input.isActive,
              ...(input.lastConnectionTest && {
                lastConnectionTest: input.lastConnectionTest,
              }),
              updatedBy: input.userId,
              updatedAt: new Date(),
            },
          });

        if (!input.isActive) return;

        const sameMethodMappers = tx
          .select({ id: paymentProviderMarketMappers.id })
          .from(paymentProviderMarketMappers)
          .where(
            eq(paymentProviderMarketMappers.paymentMethod, input.paymentMethod),
          );

        await tx
          .update(tenantPaymentConfigs)
          .set({
            isActive: false,
            updatedBy: input.userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tenantPaymentConfigs.branchId, input.branchId),
              eq(tenantPaymentConfigs.isActive, true),
              ne(
                tenantPaymentConfigs.paymentProviderMarketMapperId,
                input.mapperId,
              ),
              inArray(
                tenantPaymentConfigs.paymentProviderMarketMapperId,
                sameMethodMappers,
              ),
            ),
          );
      });
    } catch (error) {
      logger.error("[PAYMENT_SAVE_TENANT_PAYMENT_CONFIG_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  private async findMappingsByProviderIds(
    providerIds: string[],
  ): Promise<Map<string, PaymentProviderMappingWithMarket[]>> {
    try {
      const mappingsByProviderId = new Map<
        string,
        PaymentProviderMappingWithMarket[]
      >();
      if (providerIds.length === 0) return await mappingsByProviderId;

      const rows = await this.database.client
        .select({
          mapping: paymentProviderMarketMappers,
          market: {
            id: markets.id,
            name: markets.name,
            countryCode: markets.countryCode,
            currencyCode: markets.currencyCode,
          },
        })
        .from(paymentProviderMarketMappers)
        .innerJoin(
          markets,
          eq(paymentProviderMarketMappers.marketId, markets.id),
        )
        .where(inArray(paymentProviderMarketMappers.providerId, providerIds))
        .orderBy(
          asc(markets.name),
          asc(paymentProviderMarketMappers.paymentMethod),
        );

      for (const row of rows) {
        const mappings = mappingsByProviderId.get(row.mapping.providerId) ?? [];
        mappings.push({ ...row.mapping, market: row.market });
        mappingsByProviderId.set(row.mapping.providerId, mappings);
      }

      return await mappingsByProviderId;
    } catch (error) {
      logger.error("[PAYMENT_FIND_MAPPINGS_BY_PROVIDER_IDS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }
}
