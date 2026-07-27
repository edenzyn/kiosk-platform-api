import {
  type AnyPgColumn,
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../user/user.schema";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
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

export type OrganizationEntity = typeof organizations.$inferSelect;
export type CreateOrganizationEntity = typeof organizations.$inferInsert;
