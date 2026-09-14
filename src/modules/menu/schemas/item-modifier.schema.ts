import {
  boolean,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { menuItems } from "./menu-item.schema";

export const itemModifiers = pgTable("item_modifiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references((): AnyPgColumn => menuItems.id),
  name: varchar("name", { length: 100 }).notNull(),
  selectionType: smallint("selection_type").notNull(), // ItemModifierSelectionTypeEnum: 1 = SINGLE, 2 = MULTIPLE
  minSelection: integer("min_selection").default(0).notNull(),
  maxSelection: integer("max_selection").default(1).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
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

export type ItemModifierEntity = typeof itemModifiers.$inferSelect;
export type CreateItemModifierEntity = typeof itemModifiers.$inferInsert;
