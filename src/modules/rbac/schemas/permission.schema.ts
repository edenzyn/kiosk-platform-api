import {
  type AnyPgColumn,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { branches } from "../../branch/branch.schema";
import { PermissionStatusEnum } from "../../../shared/enums/rbac/PermissionEnums";
import { users } from "../../user/user.schema";

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  status: smallint("status").default(PermissionStatusEnum.ENABLED).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type PermissionEntity = typeof permissions.$inferSelect;
export type CreatePermissionEntity = typeof permissions.$inferInsert;
