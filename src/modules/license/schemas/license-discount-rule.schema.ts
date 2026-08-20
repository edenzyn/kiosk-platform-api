import {
  boolean,
  decimal,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const licenseDiscountRules = pgTable("license_discount_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  targetEntity: smallint("target_entity").notNull(), // LicenseDiscountRuleTargetEntityTypeEnum: 1 = ORGANIZATIONS, 2 = RESELLERS, 3 = RESELLER_INDIVIDUAL, 4 = LICENSE_PLAN_INDIVIDUAL
  discountType: smallint("discount_type").notNull(), // e.g. PERCENTAGE = 1, FLAT = 2
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }), // Only meaningful for FLAT discounts
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

export type LicenseDiscountRuleEntity = typeof licenseDiscountRules.$inferSelect;
export type CreateLicenseDiscountRuleEntity = typeof licenseDiscountRules.$inferInsert;
