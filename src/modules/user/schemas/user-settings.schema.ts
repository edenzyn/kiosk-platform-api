import {
  boolean,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_PRIMARY_COLOR } from "../../../shared/constants/theme.constants";
import { ThemeModeEnums } from "../../../shared/enums/theme/theme-mode.enum";
import type { TwoFactorMethodEnums } from "../../../shared/enums/user/two-factor-method.enum";
import { users } from "./user.schema";

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => users.id),
  themeMode: varchar("theme_mode", { length: 20 })
    .notNull()
    .default(ThemeModeEnums.SYSTEM),
  primaryColor: varchar("primary_color", { length: 20 })
    .notNull()
    .default(DEFAULT_PRIMARY_COLOR),
  languageCode: varchar("language_code", { length: 10 })
    .notNull()
    .default("en"),
  timezone: varchar("timezone", { length: 100 })
    .notNull()
    .default("Asia/Kolkata"),
  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .default("INR"),
  // 2FA settings
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorMethod: smallint(
    "two_factor_method",
  ).$type<TwoFactorMethodEnums | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSettingsEntity = typeof userSettings.$inferSelect;
export type CreateUserSettingsEntity = typeof userSettings.$inferInsert;
