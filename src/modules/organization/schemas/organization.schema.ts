import {
  type AnyPgColumn,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  registeredName: varchar("registered_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),

  // Address Information
  country: varchar("country", { length: 100 }),
  state: varchar("state", { length: 100 }),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  area: varchar("area", { length: 255 }),
  landmark: varchar("landmark", { length: 255 }),
  address: text("address"),
  timezone: varchar("timezone", { length: 100 }),

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
