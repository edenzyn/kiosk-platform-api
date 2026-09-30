import {
  decimal,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { itemModifierOptions } from "../../menu/schemas/item-modifier-option.schema";
import { itemModifiers } from "../../menu/schemas/item-modifier.schema";
import { orderItems } from "./order-item.schema";

// One row per chosen option, so a multi-select modifier has several rows.
export const orderItemModifiers = pgTable(
  "order_item_modifiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references((): AnyPgColumn => orderItems.id),
    itemModifierId: uuid("item_modifier_id").references(
      (): AnyPgColumn => itemModifiers.id,
    ),
    itemModifierOptionId: uuid("item_modifier_option_id").references(
      (): AnyPgColumn => itemModifierOptions.id,
    ),
    modifierName: varchar("modifier_name", { length: 100 }).notNull(), // snapshot
    optionName: varchar("option_name", { length: 100 }).notNull(), // snapshot
    optionPrice: decimal("option_price", { precision: 10, scale: 2 })
      .default("0")
      .notNull(), // per unit of the parent item
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_item_modifiers_order_item_idx").on(table.orderItemId),
  ],
);

export type OrderItemModifierEntity = typeof orderItemModifiers.$inferSelect;
export type CreateOrderItemModifierEntity =
  typeof orderItemModifiers.$inferInsert;
