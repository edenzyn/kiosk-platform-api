import {
  type AnyPgColumn,
  pgTable,
  smallint,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { permissions } from "./permission.schema";
import { users } from "../../user/user.schema";

export const permissionsMapper = pgTable("permissions_mapper", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: smallint("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  permissionId: uuid("permission_id")
    .notNull()
    .references((): AnyPgColumn => permissions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
});

export type PermissionMapperEntity = typeof permissionsMapper.$inferSelect;
export type CreatePermissionMapperEntity =
  typeof permissionsMapper.$inferInsert;
