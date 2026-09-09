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
import { appTaxProfiles } from "./app-tax-profile.schema";

export const appTaxRules = pgTable("app_tax_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  taxProfileId: uuid("tax_profile_id")
    .notNull()
    .references((): AnyPgColumn => appTaxProfiles.id),
  name: varchar("name", { length: 100 }).notNull(),
  conditionType: smallint("condition_type").notNull(), // AppTaxRuleConditionTypeEnum: 1 = ALWAYS, 2 = INTRA_STATE, 3 = INTER_STATE
  priority: integer("priority").notNull().default(1),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type AppTaxRuleEntity = typeof appTaxRules.$inferSelect;
export type CreateAppTaxRuleEntity = typeof appTaxRules.$inferInsert;
