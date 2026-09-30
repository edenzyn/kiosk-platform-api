import {
  decimal,
  index,
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
import { devices } from "../../device/device.schema";
import { paymentProviders } from "../../finance/schemas/payment-provider.schema";
import { tenantPaymentConfigs } from "../../finance/schemas/tenant-payment-config.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { orders } from "./order.schema";

// One row per payment attempt - a failed QR followed by a card payment is two rows.
export const orderPayments = pgTable(
  "order_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(), // This id is sent to the provider as its merchant order id.
    orderId: uuid("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    deviceId: uuid("device_id").references((): AnyPgColumn => devices.id),
    paymentMethod: smallint("payment_method").notNull(), // TenantPaymentMethodEnum: 1 = QR, 2 = CARD, 3 = CASH
    tenantPaymentConfigId: uuid("tenant_payment_config_id").references(
      (): AnyPgColumn => tenantPaymentConfigs.id,
    ), // null for CASH
    paymentProviderId: uuid("payment_provider_id").references(
      (): AnyPgColumn => paymentProviders.id,
    ), // null for CASH
    providerSlug: varchar("provider_slug", { length: 50 }), // snapshot
    terminalId: varchar("terminal_id", { length: 100 }), // snapshot of devices.terminal_id
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    paymentStatus: smallint("payment_status").default(1).notNull(), // PaymentStatusEnum: 1 = PENDING, 2 = COMPLETED, 3 = FAILED, 4 = REFUNDED, 5 = CANCELLED
    providerTransactionId: varchar("provider_transaction_id", { length: 255 }),
    providerStatus: varchar("provider_status", { length: 50 }),
    qrPayload: text("qr_payload"),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"), // latest provider response (webhook / status check)
    failureReason: text("failure_reason"),
    initiatedAt: timestamp("initiated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    collectedBy: uuid("collected_by").references((): AnyPgColumn => users.id), // staff who accepted CASH
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_payments_order_idx").on(table.orderId),
    index("order_payments_provider_transaction_idx").on(
      table.paymentProviderId,
      table.providerTransactionId,
    ),
    index("order_payments_branch_status_idx").on(
      table.branchId,
      table.paymentStatus,
    ),
    index("order_payments_status_expires_at_idx").on(
      table.paymentStatus,
      table.expiresAt,
    ),
  ],
);

export type OrderPaymentEntity = typeof orderPayments.$inferSelect;
export type CreateOrderPaymentEntity = typeof orderPayments.$inferInsert;
