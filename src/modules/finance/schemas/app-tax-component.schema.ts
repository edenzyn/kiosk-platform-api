import {
  boolean,
  decimal,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { appTaxRules } from "./app-tax-rule.schema";

export const appTaxComponents = pgTable("app_tax_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  taxRuleId: uuid("tax_rule_id")
    .notNull()
    .references((): AnyPgColumn => appTaxRules.id),
  name: varchar("name", { length: 100 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
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

export type AppTaxComponentEntity = typeof appTaxComponents.$inferSelect;
export type CreateAppTaxComponentEntity =
  typeof appTaxComponents.$inferInsert;
