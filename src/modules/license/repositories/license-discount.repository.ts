import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL } from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountRuleScopeTypeEnum } from "../../../shared/enums/license/license-discount-rule-scope-type.enum";
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
  UpdateDiscountRuleWithTargetsRepoInput,
  UpdateDiscountRuleWithTargetsRepoResult,
} from "../license.types";
import { licensePlanDiscountRuleMapper } from "../schemas/license-plan-discount-rule-mapper.schema";
import { licensePlanDiscountRules } from "../schemas/license-plan-discount-rule.schema";
import { licensePlans } from "../schemas/license-plan.schema";

export class LicenseDiscountRepository {
  constructor(private readonly database: Database) {}

  private _marketScopeCondition(marketId?: string): SQL {
    if (!marketId) {
      // No market context: only GLOBAL rules are safe to apply.
      return eq(
        licensePlanDiscountRules.scopeType,
        LicenseDiscountRuleScopeTypeEnum.GLOBAL,
      );
    }

    return or(
      eq(
        licensePlanDiscountRules.scopeType,
        LicenseDiscountRuleScopeTypeEnum.GLOBAL,
      ),
      and(
        eq(
          licensePlanDiscountRules.scopeType,
          LicenseDiscountRuleScopeTypeEnum.MARKET,
        ),
        eq(licensePlanDiscountRules.marketId, marketId),
      ),
    ) as SQL;
  }

  async findActiveDiscountRules(
    input: FindActiveDiscountRulesRepoInput,
  ): Promise<FindActiveDiscountRulesRepoResult> {
    const now = new Date();
    const activeWindow = and(
      eq(licensePlanDiscountRules.isActive, true),
      or(
        isNull(licensePlanDiscountRules.startsAt),
        lte(licensePlanDiscountRules.startsAt, now),
      ),
      or(
        isNull(licensePlanDiscountRules.endsAt),
        gte(licensePlanDiscountRules.endsAt, now),
      ),
    );
    const marketScope = this._marketScopeCondition(input.marketId);

    const bucketRules = await this.database.client
      .select()
      .from(licensePlanDiscountRules)
      .where(
        and(
          eq(licensePlanDiscountRules.targetEntity, input.targetEntity),
          activeWindow,
          marketScope,
        ),
      );

    // Plan-specific discounts apply regardless of who's buying, so they're
    // always included alongside the caller's own bucket — but only while at
    // least one of the plans they target is still active.
    const planIndividualRules = await this.database.client
      .selectDistinct({ rule: licensePlanDiscountRules })
      .from(licensePlanDiscountRules)
      .innerJoin(
        licensePlanDiscountRuleMapper,
        eq(licensePlanDiscountRuleMapper.discountRuleId, licensePlanDiscountRules.id),
      )
      .innerJoin(
        licensePlans,
        eq(licensePlanDiscountRuleMapper.pricingId, licensePlans.id),
      )
      .where(
        and(
          eq(
            licensePlanDiscountRules.targetEntity,
            LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL,
          ),
          eq(licensePlans.isActive, true),
          activeWindow,
          marketScope,
        ),
      );

    const rules = [
      ...bucketRules,
      ...planIndividualRules.map((row) => row.rule),
    ];

    if (!input.resellerId) {
      return rules;
    }

    const resellerIndividualRules = await this.database.client
      .select({ rule: licensePlanDiscountRules })
      .from(licensePlanDiscountRules)
      .innerJoin(
        resellerDiscountRuleMapper,
        eq(resellerDiscountRuleMapper.discountRuleId, licensePlanDiscountRules.id),
      )
      .where(
        and(
          eq(
            licensePlanDiscountRules.targetEntity,
            LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL,
          ),
          eq(resellerDiscountRuleMapper.resellerId, input.resellerId),
          activeWindow,
          marketScope,
        ),
      );

    return [...rules, ...resellerIndividualRules.map((row) => row.rule)];
  }

  async findDiscountRule(
    input: FindOneDiscountRuleRepoInput,
  ): Promise<FindOneDiscountRuleRepoResult> {
    const [rule] = await this.database.client
      .select()
      .from(licensePlanDiscountRules)
      .where(eq(licensePlanDiscountRules.id, input.ruleId))
      .limit(1);

    return rule ?? null;
  }

  async findPaginatedDiscountRules(
    input: FindPaginatedDiscountRulesRepoInput,
  ): Promise<FindPaginatedDiscountRulesRepoResult> {
    const { search, targetEntity, isActive, marketId, page, limit, sortBy, sortOrder } =
      input;

    const conditions: (SQL | undefined)[] = [];
    if (targetEntity !== undefined) {
      conditions.push(eq(licensePlanDiscountRules.targetEntity, targetEntity));
    }
    if (isActive !== undefined) {
      conditions.push(eq(licensePlanDiscountRules.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(licensePlanDiscountRules.name, `%${search}%`));
    }
    if (marketId) {
      conditions.push(this._marketScopeCondition(marketId));
    }
    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licensePlanDiscountRules)
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select()
      .from(licensePlanDiscountRules)
      .where(condition)
      .$dynamic();

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === "asc" ? asc : desc;
      if (sortBy === "name") {
        query = query.orderBy(orderFn(licensePlanDiscountRules.name));
      } else if (sortBy === "discountValue") {
        query = query.orderBy(orderFn(licensePlanDiscountRules.discountValue));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(licensePlanDiscountRules.createdAt));
      }
    } else {
      query = query.orderBy(desc(licensePlanDiscountRules.createdAt));
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
          discountRuleId: licensePlanDiscountRuleMapper.discountRuleId,
          id: licensePlans.id,
          name: licensePlans.name,
        })
        .from(licensePlanDiscountRuleMapper)
        .innerJoin(
          licensePlans,
          eq(licensePlanDiscountRuleMapper.pricingId, licensePlans.id),
        )
        .where(
          inArray(
            licensePlanDiscountRuleMapper.discountRuleId,
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
        .insert(licensePlanDiscountRules)
        .values({
          name: input.name,
          targetEntity: input.targetEntity,
          discountType: input.discountType,
          discountValue: String(input.discountValue),
          scopeType: input.scopeType,
          marketId: input.marketId ?? null,
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
        input.licensePlanIds &&
        input.licensePlanIds.length > 0
      ) {
        await tx.insert(licensePlanDiscountRuleMapper).values(
          input.licensePlanIds.map((pricingId) => ({
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

  async updateDiscountRuleWithTargets(
    input: UpdateDiscountRuleWithTargetsRepoInput,
  ): Promise<UpdateDiscountRuleWithTargetsRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [rule] = await tx
        .update(licensePlanDiscountRules)
        .set({
          name: input.name,
          targetEntity: input.targetEntity,
          discountType: input.discountType,
          discountValue: String(input.discountValue),
          scopeType: input.scopeType,
          marketId: input.marketId ?? null,
          minQuantity: input.minQuantity,
          maxQuantity: input.maxQuantity ?? null,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          updatedBy: input.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(licensePlanDiscountRules.id, input.ruleId))
        .returning();

      if (!rule) throw new Error("Discount rule not found");

      // Simplest correct way to keep target mappings in sync with the
      // possibly-changed targetEntity/resellerIds/licensePlanIds: clear
      // everything for this rule, then re-insert for the new state.
      await tx
        .delete(resellerDiscountRuleMapper)
        .where(eq(resellerDiscountRuleMapper.discountRuleId, rule.id));
      await tx
        .delete(licensePlanDiscountRuleMapper)
        .where(eq(licensePlanDiscountRuleMapper.discountRuleId, rule.id));

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
            createdBy: input.updatedBy,
            updatedBy: input.updatedBy,
          })),
        );
      }

      if (
        input.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL &&
        input.licensePlanIds &&
        input.licensePlanIds.length > 0
      ) {
        await tx.insert(licensePlanDiscountRuleMapper).values(
          input.licensePlanIds.map((pricingId) => ({
            pricingId,
            discountRuleId: rule.id,
            createdBy: input.updatedBy,
            updatedBy: input.updatedBy,
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
      .update(licensePlanDiscountRules)
      .set({
        ...input.data,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(licensePlanDiscountRules.id, input.ruleId))
      .returning();

    if (!updated) throw new Error("Discount rule not found");
    return updated;
  }
}
