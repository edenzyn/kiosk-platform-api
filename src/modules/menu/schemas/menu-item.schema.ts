import {
  boolean,
  decimal,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";
import { branches } from "../../branch/schemas/branch.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { menuCategories } from "./menu-category.schema";

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id),
  branchId: uuid("branch_id")
    .notNull()
    .references((): AnyPgColumn => branches.id),
  categoryId: uuid("category_id")
    .notNull()
    .references((): AnyPgColumn => menuCategories.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  image: varchar("image", { length: 255 }),
  takeawayChargeEnabled: boolean("takeaway_charge_enabled")
    .default(false)
    .notNull(),
  takeawayChargeAmount: decimal("takeaway_charge_amount", {
    precision: 10,
    scale: 2,
  }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isListed: boolean("is_listed").default(true).notNull(),
  calories: decimal("calories", { precision: 10, scale: 2 }),
  dietaryType: smallint("dietary_type")
    .default(DietaryTypeEnum.NON_VEGETARIAN)
    .notNull(), // DietaryTypeEnum: 1 = VEGETARIAN, 2 = NON_VEGETARIAN
  hasAlcohol: boolean("has_alcohol").default(false).notNull(),
  isSpicy: boolean("is_spicy").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type MenuItemEntity = typeof menuItems.$inferSelect;
export type CreateMenuItemEntity = typeof menuItems.$inferInsert;
