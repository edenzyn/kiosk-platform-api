import {
  boolean,
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { itemModifiers } from "./item-modifier.schema";

export const itemModifierOptions = pgTable("item_modifier_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemModifierId: uuid("item_modifier_id")
    .notNull()
    .references((): AnyPgColumn => itemModifiers.id),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type ItemModifierOptionEntity = typeof itemModifierOptions.$inferSelect;
export type CreateItemModifierOptionEntity =
  typeof itemModifierOptions.$inferInsert;
