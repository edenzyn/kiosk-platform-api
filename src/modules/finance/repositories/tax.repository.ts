import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../config/db";
import type {
  CreateTaxProfileRepoInput,
  CreateTaxProfileRepoResult,
  FindComponentsByProfileIdRepoInput,
  FindComponentsByProfileIdRepoResult,
  FindOneTaxProfileRepoInput,
  FindOneTaxProfileRepoResult,
  FindTaxProfileSummariesByIdsRepoInput,
  FindTaxProfileSummariesByIdsRepoResult,
  UpdateTaxProfileRepoInput,
  UpdateTaxProfileRepoResult,
} from "../finance.types";
import { appTaxComponents } from "../schemas/app-tax-component.schema";
import { appTaxProfiles } from "../schemas/app-tax-profile.schema";

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
}
