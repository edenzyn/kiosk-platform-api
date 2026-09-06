import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { licensePlanDiscountRules } from "./license-plan-discount-rule.schema";
import { licensePlans } from "./license-plan.schema";

// Resolves LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL -
// which specific pricing plan a discount rule applies to, mirroring how
// reseller_discount_rule_mapper resolves RESELLER_INDIVIDUAL.
export const licensePlanDiscountRuleMapper = pgTable(
  "license_plan_discount_rule_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pricingId: uuid("pricing_id")
      .notNull()
      .references((): AnyPgColumn => licensePlans.id),
    discountRuleId: uuid("discount_rule_id")
      .notNull()
      .references((): AnyPgColumn => licensePlanDiscountRules.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
  },
);

export type LicensePlanDiscountRuleMapperEntity =
  typeof licensePlanDiscountRuleMapper.$inferSelect;
export type CreateLicensePlanDiscountRuleMapperEntity =
  typeof licensePlanDiscountRuleMapper.$inferInsert;
