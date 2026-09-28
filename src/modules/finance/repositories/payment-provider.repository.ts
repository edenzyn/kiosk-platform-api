import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../config/db";
import { markets } from "../../market/schemas/market.schema";
import { paymentProviderMarketMappers } from "../schemas/payment-provider-market-mapper.schema";
import { paymentProviders } from "../schemas/payment-provider.schema";
import type {
  CreatePaymentProviderWithMappingsRepoInput,
  CreatePaymentProviderWithMappingsRepoResult,
  FindAllPaymentProvidersWithMappingsRepoResult,
  FindOnePaymentProviderBySlugRepoInput,
  FindOnePaymentProviderBySlugRepoResult,
  FindOnePaymentProviderRepoInput,
  FindOnePaymentProviderRepoResult,
  FindOnePaymentProviderWithMappingsRepoInput,
  FindOnePaymentProviderWithMappingsRepoResult,
  PaymentProviderMappingWithMarket,
  UpdatePaymentProviderRepoInput,
  UpdatePaymentProviderRepoResult,
  UpdatePaymentProviderWithMappingsRepoInput,
  UpdatePaymentProviderWithMappingsRepoResult,
} from "../types/payment-provider.types";

export class PaymentProviderRepository {
  constructor(private readonly database: Database) {}

  async findAllWithMappings(): Promise<FindAllPaymentProvidersWithMappingsRepoResult> {
    const providers = await this.database.client
      .select()
      .from(paymentProviders)
      .orderBy(asc(paymentProviders.createdAt));

    const mappingsByProviderId = await this.findMappingsByProviderIds(
      providers.map((provider) => provider.id),
    );

    return providers.map((provider) => ({
      ...provider,
      mappings: mappingsByProviderId.get(provider.id) ?? [],
    }));
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

  async findOneBySlug(
    input: FindOnePaymentProviderBySlugRepoInput,
  ): Promise<FindOnePaymentProviderBySlugRepoResult> {
    const [provider] = await this.database.client
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.slug, input.slug))
      .limit(1);

    return provider ?? null;
  }

  async createWithMappings(
    input: CreatePaymentProviderWithMappingsRepoInput,
  ): Promise<CreatePaymentProviderWithMappingsRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [provider] = await tx
        .insert(paymentProviders)
        .values({
          name: input.name,
          slug: input.slug,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      if (!provider) throw new Error("Failed to create payment provider");

      if (input.mappings.length > 0) {
        await tx.insert(paymentProviderMarketMappers).values(
          input.mappings.map((mapping) => ({
            providerId: provider.id,
            marketId: mapping.marketId,
            paymentMethod: mapping.paymentMethod,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      return provider;
    });
  }

  async updateWithMappings(
    input: UpdatePaymentProviderWithMappingsRepoInput,
  ): Promise<UpdatePaymentProviderWithMappingsRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [provider] = await tx
        .update(paymentProviders)
        .set({
          name: input.name,
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
