import {
  type AnyPgColumn,
  pgTable,
  smallint,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { branches } from "../../branch/branch.schema";
import { users } from "../../user/user.schema";
import { permissions } from "./permission.schema";

export const permissionMapper = pgTable("permission_mapper", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: smallint("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  permissionId: uuid("permission_id")
    .references((): AnyPgColumn => permissions.id)
    .notNull(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type PermissionMapperEntity = typeof permissionMapper.$inferSelect;
export type CreatePermissionMapperEntity = typeof permissionMapper.$inferInsert;
