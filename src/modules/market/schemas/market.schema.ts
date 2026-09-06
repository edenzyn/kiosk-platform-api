import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const markets = pgTable("markets", {
  id: uuid("id").defaultRandom().primaryKey(),
  countryCode: varchar("country_code", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
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

export type MarketEntity = typeof markets.$inferSelect;
export type CreateMarketEntity = typeof markets.$inferInsert;
