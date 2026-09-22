import {
  boolean,
  decimal,
  index,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { tenantTaxProfiles } from "./tenant-tax-profile.schema";

export const tenantTaxComponents = pgTable(
  "tenant_tax_components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taxProfileId: uuid("tax_profile_id")
      .notNull()
      .references((): AnyPgColumn => tenantTaxProfiles.id),
    name: varchar("name", { length: 100 }).notNull(),
    conditionType: smallint("condition_type").default(1).notNull(), // TaxComponentConditionTypeEnum: 1 = ALWAYS, 2 = INTRA_STATE, 3 = INTER_STATE
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
  },
  (table) => [
    index("tenant_tax_components_profile_idx").on(table.taxProfileId),
  ],
);

export type TenantTaxComponentEntity = typeof tenantTaxComponents.$inferSelect;
export type CreateTenantTaxComponentEntity =
  typeof tenantTaxComponents.$inferInsert;
