import {
  decimal,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { licensePricing } from "./license-pricing.schema";
import { licenseTransactions } from "./license-transaction.schema";
import { licenses } from "./license.schema";

export const licenseTransactionItems = pgTable("license_transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references((): AnyPgColumn => licenseTransactions.id),
  licenseId: uuid("license_id").references((): AnyPgColumn => licenses.id),
  pricingPlanId: uuid("pricing_plan_id").references(
    (): AnyPgColumn => licensePricing.id,
  ),
  planName: varchar("plan_name", { length: 255 }),
  actionType: smallint("action_type").notNull(),
  durationDays: integer("duration_days").notNull(),
  baseUnitPrice: decimal("base_unit_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountPercentage: decimal("discount_percentage", {
    precision: 5,
    scale: 2,
  }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseTransactionItemEntity =
  typeof licenseTransactionItems.$inferSelect;
export type CreateLicenseTransactionItemEntity =
  typeof licenseTransactionItems.$inferInsert;
