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
import { licensePlans } from "./license-plan.schema";
import { licenseTransactions } from "./license-transaction.schema";
import { licenses } from "./license.schema";

export const licenseTransactionItems = pgTable("license_transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references((): AnyPgColumn => licenseTransactions.id),
  licenseId: uuid("license_id").references((): AnyPgColumn => licenses.id),
  planId: uuid("plan_id")
    .notNull()
    .references((): AnyPgColumn => licensePlans.id),
  planName: varchar("plan_name", { length: 100 }).notNull(), // snapshot of plan name at transaction time
  transactionType: smallint("transaction_type").notNull(), // LicenseTransactionTypeEnum: 1 = ORGANIZATION_PURCHASE, 2 = RESELLER_PURCHASE, 3 = RENEWAL
  durationDays: integer("duration_days").notNull(),
  baseUnitPrice: decimal("base_unit_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  finalUnitPrice: decimal("final_unit_price", {
    precision: 10,
    scale: 2,
  }).notNull(), // actual charged unit price
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseTransactionItemEntity =
  typeof licenseTransactionItems.$inferSelect;
export type CreateLicenseTransactionItemEntity =
  typeof licenseTransactionItems.$inferInsert;
