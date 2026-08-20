import {
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { licensePricing } from "./license-pricing.schema";
import { licenseRedemptionCodes } from "./license-redemption-code.schema";
import { licenses } from "./license.schema";

export const licenseRedemptionItems = pgTable("license_redemption_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  redemptionId: uuid("redemption_id")
    .notNull()
    .references((): AnyPgColumn => licenseRedemptionCodes.id),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  pricingId: uuid("pricing_id").references(
    (): AnyPgColumn => licensePricing.id,
  ),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  soldPrice: decimal("sold_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseRedemptionItemEntity =
  typeof licenseRedemptionItems.$inferSelect;
export type CreateLicenseRedemptionItemEntity =
  typeof licenseRedemptionItems.$inferInsert;
