import {
  boolean,
  decimal,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { appTaxProfiles } from "./app-tax-profile.schema";

export const appTaxComponents = pgTable("app_tax_components", {
  id: uuid("id").defaultRandom().primaryKey(),
  taxProfileId: uuid("tax_profile_id")
    .notNull()
    .references((): AnyPgColumn => appTaxProfiles.id),
  name: varchar("name", { length: 100 }).notNull(),
  conditionType: smallint("condition_type").notNull(), // AppTaxComponentConditionTypeEnum: 1 = ALWAYS, 2 = INTRA_STATE, 3 = INTER_STATE
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
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
