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
import { licensePlans } from "./license-plan.schema";
import { licenses } from "./license.schema";

export const licenseTerms = pgTable("license_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  planId: uuid("plan_id")
    .notNull()
    .references((): AnyPgColumn => licensePlans.id),
  lockedPlanName: varchar("locked_plan_name", { length: 100 }).notNull(),
  marketId: uuid("market_id")
    .notNull()
    .references((): AnyPgColumn => markets.id),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(), // price the license was originally sold to the reseller for
  lockedPrice: decimal("locked_price", {
    precision: 10,
    scale: 2,
  }), // price the reseller sold it to the buyer for — set later, via verify
  durationDays: integer("duration_days").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
});

export type LicenseTermsEntity = typeof licenseTerms.$inferSelect;
export type CreateLicenseTermsEntity = typeof licenseTerms.$inferInsert;
