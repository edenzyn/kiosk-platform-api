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
} from "../types/payment.types";

const SORTABLE_COLUMNS: Record<string, AnyPgColumn> = {
  name: paymentProviders.name,
  slug: paymentProviders.slug,
  createdAt: paymentProviders.createdAt,
};

export class PaymentRepository {
  constructor(private readonly database: Database) {}

  async findPaginatedWithMappings(
    input: FindPaginatedPaymentProvidersRepoInput,
  ): Promise<FindPaginatedPaymentProvidersRepoResult> {
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

    return {
      providers: providers.map((provider) => ({
        ...provider,
        mappings: mappingsByProviderId.get(provider.id) ?? [],
      })),
      total,
    };
  }

  async findOneWithMappings(
    input: FindOnePaymentProviderWithMappingsRepoInput,
  ): Promise<FindOnePaymentProviderWithMappingsRepoResult> {
    const provider = await this.findOne({ id: input.id });
    if (!provider) return null;

    const mappingsByProviderId = await this.findMappingsByProviderIds([
      provider.id,
    ]);

    return {
      ...provider,
      mappings: mappingsByProviderId.get(provider.id) ?? [],
    };
  }

  async findOne(
    input: FindOnePaymentProviderRepoInput,
  ): Promise<FindOnePaymentProviderRepoResult> {
    const [provider] = await this.database.client
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, input.id))
      .limit(1);

    return provider ?? null;
  }

  async updateWithMappings(
    input: UpdatePaymentProviderWithMappingsRepoInput,
  ): Promise<UpdatePaymentProviderWithMappingsRepoResult> {
    return this.database.client.transaction(async (tx) => {
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
  }

  async update(
    input: UpdatePaymentProviderRepoInput,
  ): Promise<UpdatePaymentProviderRepoResult> {
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
    return provider;
  }

  // ========================================
  // ? TENANT PAYMENT CONFIGS
  // ========================================
  async findTenantPaymentOptions(
    input: FindTenantPaymentOptionsRepoInput,
  ): Promise<FindTenantPaymentOptionsRepoResult> {
    return this.database.client
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
  }

  async findTenantPaymentOption(
    input: FindTenantPaymentOptionRepoInput,
  ): Promise<FindTenantPaymentOptionRepoResult> {
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

    return option ?? null;
  }

  async findTenantPaymentConfigs(
    input: FindTenantPaymentConfigsRepoInput,
  ): Promise<FindTenantPaymentConfigsRepoResult> {
    return this.database.client
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
  }

  async saveTenantPaymentConfig(
    input: SaveTenantPaymentConfigRepoInput,
  ): Promise<void> {
    await this.database.client.transaction(async (tx) => {
      await tx
        .insert(tenantPaymentConfigs)
        .values({
          organizationId: input.organizationId,
          branchId: input.branchId,
          paymentProviderMarketMapperId: input.mapperId,
          config: input.config,
          isActive: input.isActive,
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
  }

  private async findMappingsByProviderIds(
    providerIds: string[],
  ): Promise<Map<string, PaymentProviderMappingWithMarket[]>> {
    const mappingsByProviderId = new Map<
      string,
      PaymentProviderMappingWithMarket[]
    >();
    if (providerIds.length === 0) return mappingsByProviderId;

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
      .innerJoin(markets, eq(paymentProviderMarketMappers.marketId, markets.id))
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

    return mappingsByProviderId;
  }
}
