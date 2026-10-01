import {
  boolean,
  decimal,
  index,
  integer,
  pgSequence,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/schemas/branch.schema";
import { devices } from "../../device/device.schema";
import { tenantTaxProfiles } from "../../finance/schemas/tenant-tax-profile.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";

// Global counter behind order numbers, so they never repeat across branches.
export const orderNumberSequence = pgSequence("order_number_seq", {
  startWith: 1,
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    deviceId: uuid("device_id").references((): AnyPgColumn => devices.id),
    orderNumber: varchar("order_number", { length: 30 }).notNull(),
    tokenNumber: integer("token_number").notNull(), // Restarts every business day (cutoff from business_day_cutoff_logs)
    idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull(),
    orderSource: smallint("order_source").notNull(), // OrderSourceEnum: 1 = KIOSK, 2 = COUNTER
    orderType: smallint("order_type").notNull(), // OrderTypeEnum: 1 = DINE_IN, 2 = TAKEAWAY
    orderStatus: smallint("order_status").default(1).notNull(), // OrderStatusEnum: 1 = PENDING_PAYMENT, 2 = PLACED, 3 = PREPARING, 4 = READY, 5 = COMPLETED, 6 = CANCELLED
    paymentStatus: smallint("payment_status").default(1).notNull(), // OrderPaymentStatusEnum: 1 = PENDING, 2 = COMPLETED, 3 = FAILED, 4 = REFUNDED, 5 = CANCELLED
    paymentMethod: smallint("payment_method"), // TenantPaymentMethodEnum: 1 = QR, 2 = CARD, 3 = CASH
    currencyCode: varchar("currency_code", { length: 3 }).notNull(), // snapshot of the branch market currency
    // Pricing snapshot
    subtotalAmount: decimal("subtotal_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    takeawayChargeAmount: decimal("takeaway_charge_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    amountBeforeTax: decimal("amount_before_tax", {
      precision: 10,
      scale: 2,
    }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    isTaxInclusive: boolean("is_tax_inclusive").default(false).notNull(), // snapshot of the tax profile setting
    taxProfileId: uuid("tax_profile_id").references(
      (): AnyPgColumn => tenantTaxProfiles.id,
    ),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    // Customer
    customerName: varchar("customer_name", { length: 100 }),
    customerPhone: varchar("customer_phone", { length: 30 }),
    notes: text("notes"),
    // Lifecycle
    placedAt: timestamp("placed_at", { withTimezone: true }),
    preparingAt: timestamp("preparing_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // PENDING_PAYMENT orders auto-cancel after this
    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    uniqueIndex("orders_device_idempotency_key_idx").on(
      table.deviceId,
      table.idempotencyKey,
    ),
    index("orders_branch_created_at_idx").on(table.branchId, table.createdAt),
    index("orders_branch_status_idx").on(table.branchId, table.orderStatus),
    index("orders_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("orders_status_expires_at_idx").on(
      table.orderStatus,
      table.expiresAt,
    ),
  ],
);

export type OrderEntity = typeof orders.$inferSelect;
export type CreateOrderEntity = typeof orders.$inferInsert;
