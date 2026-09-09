import {
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { appTaxComponents } from "../../finance/schemas/app-tax-component.schema";
import { appTaxProfiles } from "../../finance/schemas/app-tax-profile.schema";
import { licenseTransactions } from "./license-transaction.schema";

export const licenseTransactionTaxes = pgTable(
  "license_transaction_taxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references((): AnyPgColumn => licenseTransactions.id),
    taxProfileId: uuid("tax_profile_id").references(
      (): AnyPgColumn => appTaxProfiles.id,
    ),
    taxComponentId: uuid("tax_component_id").references(
      (): AnyPgColumn => appTaxComponents.id,
    ),
    taxName: varchar("tax_name", { length: 100 }).notNull(), // snapshot of the tax component name at transaction time
    taxRate: decimal("tax_rate", { precision: 10, scale: 4 }).notNull(), // snapshot of the rate applied
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("license_transaction_taxes_transaction_idx").on(
      table.transactionId,
    ),
  ],
);

export type LicenseTransactionTaxEntity =
  typeof licenseTransactionTaxes.$inferSelect;
export type CreateLicenseTransactionTaxEntity =
  typeof licenseTransactionTaxes.$inferInsert;
