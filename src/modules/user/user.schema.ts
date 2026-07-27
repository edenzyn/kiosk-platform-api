import {
  type AnyPgColumn,
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "../organization/organization.schema";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references((): AnyPgColumn => organizations.id),
  branchId: uuid("branch_id"), // TODO: Add .references(() => branches.id) once created
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  mobile: varchar("mobile", { length: 20 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  userType: integer("user_type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type UserEntity = typeof users.$inferSelect;
export type CreateUserEntity = typeof users.$inferInsert;
