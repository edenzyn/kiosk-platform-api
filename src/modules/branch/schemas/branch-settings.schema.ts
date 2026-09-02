import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_PRIMARY_COLOR } from "../../../shared/constants/theme.constants";
import { branches } from "./branch.schema";

export const branchSettings = pgTable("branch_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => branches.id),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 20 })
    .notNull()
    .default(DEFAULT_PRIMARY_COLOR),
  languageCode: varchar("language_code", { length: 10 })
    .notNull()
    .default("en"),
  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .default("INR"),
  timezone: varchar("timezone", { length: 100 })
    .notNull()
    .default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BranchSettingsEntity = typeof branchSettings.$inferSelect;
export type CreateBranchSettingsEntity = typeof branchSettings.$inferInsert;
