import {
  decimal,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/branch.schema";
import { organizations } from "../../organization/organization.schema";
import { licenseDiscountRules } from "./license-discount-rule.schema";
import { users } from "../../user/schemas/user.schema";

export const licenseTransactions = pgTable("license_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  // Pricing snapshot
  subtotalAmount: decimal("subtotal_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  discountPercentage: decimal("discount_percentage", {
    precision: 5,
    scale: 2,
  }),
  appliedDiscountRuleId: uuid("applied_discount_rule_id").references(
    (): AnyPgColumn => licenseDiscountRules.id,
  ),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  // Payment
  paymentMethod: smallint("payment_method"),
  paymentProvider: smallint("payment_provider"),
  paymentStatus: smallint("payment_status"),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentProviderOrderId: varchar("payment_provider_order_id", {
    length: 255,
  }),
  intentPayload: jsonb("intent_payload"),
  failureReason: text("failure_reason"),
  transactionAt: timestamp("transaction_at", { withTimezone: true }),
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicenseTransactionEntity = typeof licenseTransactions.$inferSelect;
export type CreateLicenseTransactionEntity =
  typeof licenseTransactions.$inferInsert;
