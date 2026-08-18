import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { licenseDiscountRules } from "./license-discount-rule.schema";
import { licensePricing } from "./license-pricing.schema";

// Resolves LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL -
// which specific pricing plan a discount rule applies to, mirroring how
// reseller_discount_rule_mapper resolves RESELLER_INDIVIDUAL.
export const licensePricingDiscountRuleMapper = pgTable(
  "license_pricing_discount_rule_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pricingId: uuid("pricing_id")
      .notNull()
      .references((): AnyPgColumn => licensePricing.id),
    discountRuleId: uuid("discount_rule_id")
      .notNull()
      .references((): AnyPgColumn => licenseDiscountRules.id),
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

export type LicensePricingDiscountRuleMapperEntity =
  typeof licensePricingDiscountRuleMapper.$inferSelect;
export type CreateLicensePricingDiscountRuleMapperEntity =
  typeof licensePricingDiscountRuleMapper.$inferInsert;
