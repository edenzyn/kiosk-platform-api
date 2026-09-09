import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const appTaxProfiles = pgTable("app_tax_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  isTaxInclusive: boolean("is_tax_inclusive").default(false).notNull(),
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

export type AppTaxProfileEntity = typeof appTaxProfiles.$inferSelect;
export type CreateAppTaxProfileEntity = typeof appTaxProfiles.$inferInsert;
