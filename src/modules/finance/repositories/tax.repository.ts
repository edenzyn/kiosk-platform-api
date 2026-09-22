import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../config/db";
import type {
  CreateTaxProfileRepoInput,
  CreateTaxProfileRepoResult,
  CreateTenantTaxProfileRepoInput,
  FindComponentsByProfileIdRepoInput,
  FindComponentsByProfileIdRepoResult,
  FindOneTaxProfileRepoInput,
  FindOneTaxProfileRepoResult,
  FindTaxProfileSummariesByIdsRepoInput,
  FindTaxProfileSummariesByIdsRepoResult,
  FindTenantTaxProfileRepoInput,
  TenantTaxComponentRepoInput,
  TenantTaxProfileWithComponents,
  UpdateTaxProfileRepoInput,
  UpdateTaxProfileRepoResult,
  UpdateTenantTaxProfileRepoInput,
} from "../finance.types";
import { appTaxComponents } from "../schemas/app-tax-component.schema";
import { appTaxProfiles } from "../schemas/app-tax-profile.schema";
import { tenantTaxComponents } from "../schemas/tenant-tax-component.schema";
import { tenantTaxProfiles } from "../schemas/tenant-tax-profile.schema";

type Transaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

export class TaxRepository {
  constructor(private readonly database: Database) {}

  async findOne(
    input: FindOneTaxProfileRepoInput,
  ): Promise<FindOneTaxProfileRepoResult> {
    const [taxProfile] = await this.database.client
      .select()
      .from(appTaxProfiles)
      .where(eq(appTaxProfiles.id, input.id))
      .limit(1);

    return taxProfile ?? null;
  }

  async findComponentsByProfileId(
    input: FindComponentsByProfileIdRepoInput,
  ): Promise<FindComponentsByProfileIdRepoResult> {
    return this.database.client
      .select()
      .from(appTaxComponents)
      .where(
        and(
          eq(appTaxComponents.taxProfileId, input.taxProfileId),
          eq(appTaxComponents.isActive, true),
        ),
      )
      .orderBy(asc(appTaxComponents.createdAt));
  }

  async findTaxProfileSummariesByIds(
    input: FindTaxProfileSummariesByIdsRepoInput,
  ): Promise<FindTaxProfileSummariesByIdsRepoResult> {
    if (input.taxProfileIds.length === 0) return [];

    return this.database.client
      .select({ id: appTaxProfiles.id, name: appTaxProfiles.name })
      .from(appTaxProfiles)
      .where(inArray(appTaxProfiles.id, input.taxProfileIds));
  }

  async createTaxProfileWithComponents(
    input: CreateTaxProfileRepoInput,
  ): Promise<CreateTaxProfileRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [taxProfile] = await tx
        .insert(appTaxProfiles)
        .values({
          name: input.name,
          isTaxInclusive: input.isTaxInclusive,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      if (!taxProfile) throw new Error("Failed to create tax profile");

      if (input.components.length > 0) {
        await tx.insert(appTaxComponents).values(
          input.components.map((component) => ({
            taxProfileId: taxProfile.id,
            name: component.name,
            conditionType: component.conditionType,
            rate: String(component.rate),
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      return taxProfile;
    });
  }

  async updateTaxProfileWithComponents(
    input: UpdateTaxProfileRepoInput,
  ): Promise<UpdateTaxProfileRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [taxProfile] = await tx
        .update(appTaxProfiles)
        .set({
          name: input.name,
          isTaxInclusive: input.isTaxInclusive,
          updatedBy: input.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(appTaxProfiles.id, input.taxProfileId))
        .returning();

      if (!taxProfile) throw new Error("Tax profile not found");

      if (input.deletedComponentIds.length > 0) {
        await tx
          .update(appTaxComponents)
          .set({
            isActive: false,
            updatedBy: input.updatedBy,
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(appTaxComponents.id, input.deletedComponentIds),
              eq(appTaxComponents.taxProfileId, taxProfile.id),
            ),
          );
      }

      for (const component of input.components) {
        if (component.id) {
          await tx
            .update(appTaxComponents)
            .set({
              name: component.name,
              conditionType: component.conditionType,
              rate: String(component.rate),
              isActive: true,
              updatedBy: input.updatedBy,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(appTaxComponents.id, component.id),
                eq(appTaxComponents.taxProfileId, taxProfile.id),
              ),
            );
          continue;
        }

        const [inactiveMatch] = await tx
          .select({ id: appTaxComponents.id })
          .from(appTaxComponents)
          .where(
            and(
              eq(appTaxComponents.taxProfileId, taxProfile.id),
              eq(appTaxComponents.name, component.name),
              eq(appTaxComponents.conditionType, component.conditionType),
              eq(appTaxComponents.isActive, false),
            ),
          )
          .limit(1);

        if (inactiveMatch) {
          await tx
            .update(appTaxComponents)
            .set({
              rate: String(component.rate),
              isActive: true,
              updatedBy: input.updatedBy,
              updatedAt: new Date(),
            })
            .where(eq(appTaxComponents.id, inactiveMatch.id));
        } else {
          await tx.insert(appTaxComponents).values({
            taxProfileId: taxProfile.id,
            name: component.name,
            conditionType: component.conditionType,
            rate: String(component.rate),
            createdBy: input.updatedBy,
            updatedBy: input.updatedBy,
          });
        }
      }

      return taxProfile;
    });
  }

  // ========================================
  // ? TENANT TAX PROFILES
  // ========================================
  async findTenantProfile(
    input: FindTenantTaxProfileRepoInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const [profile] = await this.database.client
      .select()
      .from(tenantTaxProfiles)
      .where(
        and(
          eq(tenantTaxProfiles.organizationId, input.organizationId),
          eq(tenantTaxProfiles.branchId, input.branchId),
          eq(tenantTaxProfiles.isActive, true),
        ),
      )
      .orderBy(asc(tenantTaxProfiles.createdAt))
      .limit(1);

    if (!profile) return null;

    const components = await this.database.client
      .select()
      .from(tenantTaxComponents)
      .where(
        and(
          eq(tenantTaxComponents.taxProfileId, profile.id),
          eq(tenantTaxComponents.isActive, true),
        ),
      )
      .orderBy(asc(tenantTaxComponents.name));

    return { ...profile, components };
  }

  async createTenantProfile(
    input: CreateTenantTaxProfileRepoInput,
  ): Promise<TenantTaxProfileWithComponents> {
    const { data } = input;

    return this.database.client.transaction(async (tx) => {
      const [profile] = await tx
        .insert(tenantTaxProfiles)
        .values({
          organizationId: data.organizationId,
          branchId: data.branchId,
          name: data.name,
          isTaxInclusive: data.isTaxInclusive,
          createdBy: data.createdBy,
        })
        .returning();

      if (!profile) {
        throw new Error("Failed to create tenant tax profile");
      }

      const components = await this.insertComponents(
        tx,
        profile.id,
        data.components,
        data.createdBy,
      );

      return { ...profile, components };
    });
  }

  async updateTenantProfile(
    input: UpdateTenantTaxProfileRepoInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const { data } = input;

    return this.database.client.transaction(async (tx) => {
      const [profile] = await tx
        .update(tenantTaxProfiles)
        .set({
          name: data.name,
          isTaxInclusive: data.isTaxInclusive,
          updatedAt: new Date(),
          updatedBy: data.updatedBy,
        })
        .where(
          and(
            eq(tenantTaxProfiles.id, data.id),
            eq(tenantTaxProfiles.organizationId, data.organizationId),
            eq(tenantTaxProfiles.branchId, data.branchId),
          ),
        )
        .returning();

      if (!profile) return null;

      // The payload is the whole component list: anything it leaves out is gone.
      const keptIds = data.components
        .map((component) => component.id)
        .filter((id): id is string => Boolean(id));

      const existing = await tx
        .select({ id: tenantTaxComponents.id })
        .from(tenantTaxComponents)
        .where(eq(tenantTaxComponents.taxProfileId, profile.id));

      const removedIds = existing
        .map((component) => component.id)
        .filter((id) => !keptIds.includes(id));

      if (removedIds.length > 0) {
        await tx
          .delete(tenantTaxComponents)
          .where(inArray(tenantTaxComponents.id, removedIds));
      }

      for (const component of data.components) {
        if (component.id) {
          await tx
            .update(tenantTaxComponents)
            .set({
              name: component.name,
              conditionType: component.conditionType,
              rate: String(component.rate),
              isActive: true,
              updatedAt: new Date(),
              updatedBy: data.updatedBy,
            })
            .where(eq(tenantTaxComponents.id, component.id));
          continue;
        }

        await this.insertComponents(
          tx,
          profile.id,
          [component],
          data.updatedBy,
        );
      }

      const components = await tx
        .select()
        .from(tenantTaxComponents)
        .where(eq(tenantTaxComponents.taxProfileId, profile.id))
        .orderBy(asc(tenantTaxComponents.name));

      return { ...profile, components };
    });
  }

  private async insertComponents(
    tx: Transaction,
    taxProfileId: string,
    components: TenantTaxComponentRepoInput[],
    createdBy: string,
  ) {
    return tx
      .insert(tenantTaxComponents)
      .values(
        components.map((component) => ({
          taxProfileId,
          name: component.name,
          conditionType: component.conditionType,
          rate: String(component.rate),
          isActive: true,
          createdBy,
        })),
      )
      .returning();
  }
}
