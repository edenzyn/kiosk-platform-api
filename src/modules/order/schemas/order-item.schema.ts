import {
  decimal,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { menuCategories } from "../../menu/schemas/menu-category.schema";
import { menuItems } from "../../menu/schemas/menu-item.schema";
import { orders } from "./order.schema";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id),
    menuItemId: uuid("menu_item_id").references(
      (): AnyPgColumn => menuItems.id,
    ),
    menuCategoryId: uuid("menu_category_id").references(
      (): AnyPgColumn => menuCategories.id,
    ),
    // Snapshot of the menu item at order time
    itemName: varchar("item_name", { length: 150 }).notNull(),
    itemCode: varchar("item_code", { length: 100 }),
    categoryName: varchar("category_name", { length: 100 }),
    image: varchar("image", { length: 255 }),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    modifiersUnitAmount: decimal("modifiers_unit_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(), // sum of the chosen option prices for one unit
    takeawayChargeUnitAmount: decimal("takeaway_charge_unit_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),
    lineSubtotal: decimal("line_subtotal", {
      precision: 10,
      scale: 2,
    }).notNull(), // (unitPrice + modifiersUnitAmount) x quantity
    takeawayChargeAmount: decimal("takeaway_charge_amount", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(), // takeawayChargeUnitAmount x quantity
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(), // lineSubtotal + takeawayChargeAmount - discountAmount (pre-tax)
    notes: text("notes"),
    itemStatus: smallint("item_status").default(1).notNull(), // OrderItemStatusEnum: 1 = PENDING, 2 = PREPARING, 3 = READY, 4 = SERVED, 5 = CANCELLED
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_menu_item_idx").on(table.menuItemId),
  ],
);

export type OrderItemEntity = typeof orderItems.$inferSelect;
export type CreateOrderItemEntity = typeof orderItems.$inferInsert;
