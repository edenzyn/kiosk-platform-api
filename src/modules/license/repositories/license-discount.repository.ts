import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL } from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { resellerDiscountRuleMapper } from "../../reseller/schemas/reseller-discount-rule-mapper.schema";
import { users } from "../../user/schemas/user.schema";
import type {
  CreateDiscountRuleWithTargetsRepoInput,
  CreateDiscountRuleWithTargetsRepoResult,
  FindActiveDiscountRulesRepoInput,
  FindActiveDiscountRulesRepoResult,
  FindDiscountRuleTargetsRepoInput,
  FindDiscountRuleTargetsRepoResult,
  FindOneDiscountRuleRepoInput,
  FindOneDiscountRuleRepoResult,
  FindPaginatedDiscountRulesRepoInput,
  FindPaginatedDiscountRulesRepoResult,
  UpdateDiscountRuleRepoInput,
  UpdateDiscountRuleRepoResult,
} from "../license.types";
import { licenseDiscountRules } from "../schemas/license-discount-rule.schema";
import { licensePricingDiscountRuleMapper } from "../schemas/license-pricing-discount-rule-mapper.schema";
import { licensePricing } from "../schemas/license-pricing.schema";

export class LicenseDiscountRepository {
  constructor(private readonly database: Database) {}

  async findActiveDiscountRules(
    input: FindActiveDiscountRulesRepoInput,
  ): Promise<FindActiveDiscountRulesRepoResult> {
    const now = new Date();
    const rules = await this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(
        and(
          eq(licenseDiscountRules.targetEntity, input.targetEntity),
          eq(licenseDiscountRules.isActive, true),
          or(
            isNull(licenseDiscountRules.startsAt),
            lte(licenseDiscountRules.startsAt, now),
          ),
          or(
            isNull(licenseDiscountRules.endsAt),
            gte(licenseDiscountRules.endsAt, now),
          ),
        ),
      );

    return rules;
  }

  async findDiscountRule(
    input: FindOneDiscountRuleRepoInput,
  ): Promise<FindOneDiscountRuleRepoResult> {
    const [rule] = await this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(eq(licenseDiscountRules.id, input.ruleId))
      .limit(1);

    return rule ?? null;
  }

  async findPaginatedDiscountRules(
    input: FindPaginatedDiscountRulesRepoInput,
  ): Promise<FindPaginatedDiscountRulesRepoResult> {
    const { search, targetEntity, isActive, page, limit, sortBy, sortOrder } =
      input;

    const conditions: (SQL | undefined)[] = [];
    if (targetEntity !== undefined) {
      conditions.push(eq(licenseDiscountRules.targetEntity, targetEntity));
    }
    if (isActive !== undefined) {
      conditions.push(eq(licenseDiscountRules.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(licenseDiscountRules.name, `%${search}%`));
    }
    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licenseDiscountRules)
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(condition)
      .$dynamic();

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === "asc" ? asc : desc;
      if (sortBy === "name") {
        query = query.orderBy(orderFn(licenseDiscountRules.name));
      } else if (sortBy === "discountValue") {
        query = query.orderBy(orderFn(licenseDiscountRules.discountValue));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(licenseDiscountRules.createdAt));
      }
    } else {
      query = query.orderBy(desc(licenseDiscountRules.createdAt));
    }

    query = query.limit(limit).offset((page - 1) * limit);

    const rules = await query;
    return { rules, total };
  }

  async findDiscountRuleTargets(
    input: FindDiscountRuleTargetsRepoInput,
  ): Promise<FindDiscountRuleTargetsRepoResult> {
    const result: FindDiscountRuleTargetsRepoResult = new Map();
    if (input.ruleIds.length === 0) return result;

    if (
      input.targetEntity ===
      LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL
    ) {
      const rows = await this.database.client
        .select({
          discountRuleId: resellerDiscountRuleMapper.discountRuleId,
          id: users.id,
          name: users.name,
        })
        .from(resellerDiscountRuleMapper)
        .innerJoin(users, eq(resellerDiscountRuleMapper.resellerId, users.id))
        .where(
          inArray(resellerDiscountRuleMapper.discountRuleId, input.ruleIds),
        );

      for (const row of rows) {
        const existing = result.get(row.discountRuleId) ?? [];
        existing.push({ id: row.id, name: row.name });
        result.set(row.discountRuleId, existing);
      }
      return result;
    }

    if (
      input.targetEntity ===
      LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL
    ) {
      const rows = await this.database.client
        .select({
          discountRuleId: licensePricingDiscountRuleMapper.discountRuleId,
          id: licensePricing.id,
          name: licensePricing.name,
        })
        .from(licensePricingDiscountRuleMapper)
        .innerJoin(
          licensePricing,
          eq(licensePricingDiscountRuleMapper.pricingId, licensePricing.id),
        )
        .where(
          inArray(
            licensePricingDiscountRuleMapper.discountRuleId,
            input.ruleIds,
          ),
        );

      for (const row of rows) {
        const existing = result.get(row.discountRuleId) ?? [];
        existing.push({ id: row.id, name: row.name });
        result.set(row.discountRuleId, existing);
      }
      return result;
    }

    return result;
  }

  async createDiscountRuleWithTargets(
    input: CreateDiscountRuleWithTargetsRepoInput,
  ): Promise<CreateDiscountRuleWithTargetsRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [rule] = await tx
        .insert(licenseDiscountRules)
        .values({
          name: input.name,
          targetEntity: input.targetEntity,
          discountType: input.discountType,
          discountValue: String(input.discountValue),
          minQuantity: input.minQuantity,
          maxQuantity: input.maxQuantity ?? null,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      if (!rule) throw new Error("Failed to create discount rule");

      if (
        input.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL &&
        input.resellerIds &&
        input.resellerIds.length > 0
      ) {
        await tx.insert(resellerDiscountRuleMapper).values(
          input.resellerIds.map((resellerId) => ({
            resellerId,
            discountRuleId: rule.id,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      if (
        input.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL &&
        input.pricingPlanIds &&
        input.pricingPlanIds.length > 0
      ) {
        await tx.insert(licensePricingDiscountRuleMapper).values(
          input.pricingPlanIds.map((pricingId) => ({
            pricingId,
            discountRuleId: rule.id,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      return rule;
    });
  }

  async updateDiscountRule(
    input: UpdateDiscountRuleRepoInput,
  ): Promise<UpdateDiscountRuleRepoResult> {
    const [updated] = await this.database.client
      .update(licenseDiscountRules)
      .set({
        ...input.data,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(licenseDiscountRules.id, input.ruleId))
      .returning();

    if (!updated) throw new Error("Discount rule not found");
    return updated;
  }
}
