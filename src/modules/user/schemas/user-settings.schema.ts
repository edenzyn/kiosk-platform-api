import {
  type AnyPgColumn,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { ThemeModeEnums } from "../../../shared/enums/theme/theme-mode.enum";
import { users } from "./user.schema";

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => users.id),
  themeMode: varchar("theme_mode", { length: 20 })
    .notNull()
    .default(ThemeModeEnums.LIGHT),
  languageCode: varchar("language_code", { length: 10 }).notNull().default("en"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSettingsEntity = typeof userSettings.$inferSelect;
export type CreateUserSettingsEntity = typeof userSettings.$inferInsert;
