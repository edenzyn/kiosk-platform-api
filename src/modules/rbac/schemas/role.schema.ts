import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/branch.schema";
import { organizations } from "../../organization/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  rank: integer("rank").default(100).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type RoleEntity = typeof roles.$inferSelect;
export type CreateRoleEntity = typeof roles.$inferInsert;
