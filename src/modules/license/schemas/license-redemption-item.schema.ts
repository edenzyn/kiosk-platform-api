import {
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { licenseRedemptionCodes } from "./license-redemption-code.schema";
import { licenses } from "./license.schema";
import { licensePlans } from "./license-plan.schema";

export const licenseRedemptionItems = pgTable("license_redemption_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  redemptionId: uuid("redemption_id")
    .notNull()
    .references((): AnyPgColumn => licenseRedemptionCodes.id),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  pricingId: uuid("pricing_id").references(
    (): AnyPgColumn => licensePlans.id,
  ),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  soldPrice: decimal("sold_price", { precision: 10, scale: 2 }),
  basePriceCurrency: varchar("base_price_currency", { length: 10 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseRedemptionItemEntity =
  typeof licenseRedemptionItems.$inferSelect;
export type CreateLicenseRedemptionItemEntity =
  typeof licenseRedemptionItems.$inferInsert;
