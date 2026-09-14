import {
  boolean,
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { markets } from "../../market/schemas/market.schema";
import { users } from "../../user/schemas/user.schema";

export const licensePlanDiscountRules = pgTable("license_plan_discount_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  targetEntity: integer("target_entity").notNull(), // LicenseDiscountRuleTargetEntityTypeEnum: 1 = ORGANIZATIONS, 2 = RESELLERS, 3 = RESELLER_INDIVIDUAL, 4 = LICENSE_PLAN_INDIVIDUAL
  discountType: integer("discount_type").notNull(), // LicenseDiscountTypeEnum: 1 = PERCENTAGE, 2 = FLAT
  discountValue: decimal("discount_value", {
    precision: 10,
    scale: 2,
  }).notNull(),
  scopeType: integer("scope_type").notNull(), // LicenseDiscountRuleScopeTypeEnum: 1 = GLOBAL, 2 = MARKET
  marketId: uuid("market_id").references((): AnyPgColumn => markets.id), // required when scopeType = MARKET; null when GLOBAL. FLAT discounts are always MARKET-scoped.
  minQuantity: integer("min_quantity").notNull().default(1),
  maxQuantity: integer("max_quantity"), // NULL means no upper limit
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicensePlanDiscountRuleEntity =
  typeof licensePlanDiscountRules.$inferSelect;
export type CreateLicensePlanDiscountRuleEntity =
  typeof licensePlanDiscountRules.$inferInsert;
