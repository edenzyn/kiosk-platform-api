import {
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { devices } from "../../device/device.schema";
import { users } from "../../user/schemas/user.schema";
import { orderItems } from "./order-item.schema";
import { orders } from "./order.schema";

export const orderStatusLogs = pgTable(
  "order_status_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id),
    orderItemId: uuid("order_item_id").references(
      (): AnyPgColumn => orderItems.id,
    ), // set when only one item changed
    fromStatus: smallint("from_status"),
    toStatus: smallint("to_status").notNull(),
    changedByDeviceId: uuid("changed_by_device_id").references(
      (): AnyPgColumn => devices.id,
    ),
    changedBy: uuid("changed_by").references((): AnyPgColumn => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_status_logs_order_created_at_idx").on(
      table.orderId,
      table.createdAt,
    ),
  ],
);

export type OrderStatusLogEntity = typeof orderStatusLogs.$inferSelect;
export type CreateOrderStatusLogEntity = typeof orderStatusLogs.$inferInsert;
