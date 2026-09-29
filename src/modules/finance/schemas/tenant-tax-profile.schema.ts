import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/schemas/branch.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const tenantTaxProfiles = pgTable(
  "tenant_tax_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
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
  },
  (table) => [
    index("tenant_tax_profiles_tenant_idx").on(
      table.organizationId,
      table.branchId,
    ),
  ],
);

export type TenantTaxProfileEntity = typeof tenantTaxProfiles.$inferSelect;
export type CreateTenantTaxProfileEntity =
  typeof tenantTaxProfiles.$inferInsert;
