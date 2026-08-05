import {
  type AnyPgColumn,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { roles } from "./role.schema";
import { users } from "../../user/schemas/user.schema";

export const userRolesMapper = pgTable("user_roles_mapper", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
  roleId: uuid("role_id")
    .notNull()
    .references((): AnyPgColumn => roles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
});

export type UserRoleMapperEntity = typeof userRolesMapper.$inferSelect;
export type CreateUserRoleMapperEntity = typeof userRolesMapper.$inferInsert;
