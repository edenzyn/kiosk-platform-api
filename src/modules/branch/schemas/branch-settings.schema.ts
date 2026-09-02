import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { ThemeModeEnums } from "../../../shared/enums/theme/theme-mode.enum";
import { branches } from "./branch.schema";

export const branchSettings = pgTable("branch_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => branches.id),
  logoUrl: varchar("logo_url", { length: 500 }),
  themeMode: varchar("theme_mode", { length: 20 })
    .notNull()
    .default(ThemeModeEnums.SYSTEM),
  primaryColor: varchar("primary_color", { length: 20 })
    .notNull()
    .default("#10b981"),
  languageCode: varchar("language_code", { length: 10 })
    .notNull()
    .default("en"),
  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .default("INR"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BranchSettingsEntity = typeof branchSettings.$inferSelect;
export type CreateBranchSettingsEntity = typeof branchSettings.$inferInsert;
