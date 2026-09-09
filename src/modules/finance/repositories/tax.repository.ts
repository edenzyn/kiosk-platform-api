import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../../config/db";
import type {
  CreateTaxProfileRepoInput,
  CreateTaxProfileRepoResult,
  FindOneTaxProfileRepoInput,
  FindOneTaxProfileRepoResult,
  FindTaxProfileRulesRepoInput,
  FindTaxProfileRulesRepoResult,
  FindTaxRuleComponentsRepoInput,
  FindTaxRuleComponentsRepoResult,
  UpdateTaxProfileRepoInput,
  UpdateTaxProfileRepoResult,
} from "../finance.types";
import { appTaxComponents } from "../schemas/app-tax-component.schema";
import { appTaxProfiles } from "../schemas/app-tax-profile.schema";
import { appTaxRules } from "../schemas/app-tax-rule.schema";

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

  async findRulesByProfileId(
    input: FindTaxProfileRulesRepoInput,
  ): Promise<FindTaxProfileRulesRepoResult> {
    return this.database.client
      .select()
      .from(appTaxRules)
      .where(eq(appTaxRules.taxProfileId, input.taxProfileId))
      .orderBy(asc(appTaxRules.priority));
  }

  async findComponentsByRuleIds(
    input: FindTaxRuleComponentsRepoInput,
  ): Promise<FindTaxRuleComponentsRepoResult> {
    const result: FindTaxRuleComponentsRepoResult = new Map();
    if (input.taxRuleIds.length === 0) return result;

    const rows = await this.database.client
      .select()
      .from(appTaxComponents)
      .where(inArray(appTaxComponents.taxRuleId, input.taxRuleIds));

    for (const row of rows) {
      const existing = result.get(row.taxRuleId) ?? [];
      existing.push(row);
      result.set(row.taxRuleId, existing);
    }
    return result;
  }

  async createTaxProfileWithRules(
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

      for (const rule of input.rules) {
        const [insertedRule] = await tx
          .insert(appTaxRules)
          .values({
            taxProfileId: taxProfile.id,
            name: rule.name,
            conditionType: rule.conditionType,
            priority: rule.priority ?? 1,
            startsAt: rule.startsAt ?? null,
            endsAt: rule.endsAt ?? null,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })
          .returning();

        if (!insertedRule) throw new Error("Failed to create tax rule");

        if (rule.components.length > 0) {
          await tx.insert(appTaxComponents).values(
            rule.components.map((component) => ({
              taxRuleId: insertedRule.id,
              name: component.name,
              rate: String(component.rate),
              createdBy: input.createdBy,
              updatedBy: input.createdBy,
            })),
          );
        }
      }

      return taxProfile;
    });
  }

  async updateTaxProfileWithRules(
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

      const existingRules = await tx
        .select({ id: appTaxRules.id })
        .from(appTaxRules)
        .where(eq(appTaxRules.taxProfileId, taxProfile.id));
      const existingRuleIds = existingRules.map((rule) => rule.id);

      if (existingRuleIds.length > 0) {
        await tx
          .delete(appTaxComponents)
          .where(inArray(appTaxComponents.taxRuleId, existingRuleIds));
      }
      await tx
        .delete(appTaxRules)
        .where(eq(appTaxRules.taxProfileId, taxProfile.id));

      for (const rule of input.rules) {
        const [insertedRule] = await tx
          .insert(appTaxRules)
          .values({
            taxProfileId: taxProfile.id,
            name: rule.name,
            conditionType: rule.conditionType,
            priority: rule.priority ?? 1,
            startsAt: rule.startsAt ?? null,
            endsAt: rule.endsAt ?? null,
            createdBy: input.updatedBy,
            updatedBy: input.updatedBy,
          })
          .returning();

        if (!insertedRule) throw new Error("Failed to create tax rule");

        if (rule.components.length > 0) {
          await tx.insert(appTaxComponents).values(
            rule.components.map((component) => ({
              taxRuleId: insertedRule.id,
              name: component.name,
              rate: String(component.rate),
              createdBy: input.updatedBy,
              updatedBy: input.updatedBy,
            })),
          );
        }
      }

      return taxProfile;
    });
  }
}
