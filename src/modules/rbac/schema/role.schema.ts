import {
  type AnyPgColumn,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { branches } from "../../branch/branch.schema";
import { users } from "../../user/user.schema";

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id),
  branchId: uuid("branch_id")
    .notNull()
    .references((): AnyPgColumn => branches.id),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type RoleEntity = typeof roles.$inferSelect;
export type CreateRoleEntity = typeof roles.$inferInsert;

