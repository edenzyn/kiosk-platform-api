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
import { branches } from "../../branch/schemas/branch.schema";
import { markets } from "../../market/schemas/market.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { licensePlanDiscountRules } from "./license-plan-discount-rule.schema";

export const licenseTransactions = pgTable("license_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  marketId: uuid("market_id")
    .notNull()
    .references((): AnyPgColumn => markets.id),
  // Pricing snapshot
  subtotalAmount: decimal("subtotal_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountType: smallint("discount_type"), // LicenseDiscountTypeEnum
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  appliedDiscountRuleId: uuid("applied_discount_rule_id").references(
    (): AnyPgColumn => licensePlanDiscountRules.id,
  ),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
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
