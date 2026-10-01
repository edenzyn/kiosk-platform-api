import {
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { tenantTaxComponents } from "../../finance/schemas/tenant-tax-component.schema";
import { orders } from "./order.schema";

export const orderTaxes = pgTable(
  "order_taxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id),
    taxComponentId: uuid("tax_component_id").references(
      (): AnyPgColumn => tenantTaxComponents.id,
    ),
    taxName: varchar("tax_name", { length: 100 }).notNull(), // snapshot of the tax component name at order time
    taxRate: decimal("tax_rate", { precision: 10, scale: 2 }).notNull(), // snapshot of the rate applied
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_taxes_order_idx").on(table.orderId)],
);

export type OrderTaxEntity = typeof orderTaxes.$inferSelect;
export type CreateOrderTaxEntity = typeof orderTaxes.$inferInsert;
