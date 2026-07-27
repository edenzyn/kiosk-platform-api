import {
  type AnyPgColumn,
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { branches } from "../../branch/branch.schema";
import { users } from "../../user/user.schema";

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  key: varchar("key", { length: 255 }).unique(),
  organizationId: uuid("organization_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id),
  branchId: uuid("branch_id")
    .notNull()
    .references((): AnyPgColumn => branches.id),
  status: boolean("status").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type PermissionEntity = typeof permissions.$inferSelect;
export type CreatePermissionEntity = typeof permissions.$inferInsert;

