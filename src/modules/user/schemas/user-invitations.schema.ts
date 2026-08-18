import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { UserInvitationStatusEnum } from "../../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { branches } from "../../branch/branch.schema";
import { organizations } from "../../organization/organization.schema";
import { users } from "./user.schema";

export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  entityType: integer("entity_type").notNull().default(UserTypeEnums.NORMAL),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  roleIds: uuid("role_ids").array().default([]).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: integer("status").default(UserInvitationStatusEnum.PENDING).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type UserInvitationEntity = typeof userInvitations.$inferSelect;
export type CreateUserInvitationEntity = typeof userInvitations.$inferInsert;
