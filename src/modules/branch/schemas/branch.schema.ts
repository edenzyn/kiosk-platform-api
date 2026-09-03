import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  mobile: varchar("mobile", { length: 50 }),
  isActive: boolean("is_active").default(true),

  // Address Information
  country: varchar("country", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  area: varchar("area", { length: 255 }),
  landmark: varchar("landmark", { length: 255 }),
  address: text("address").notNull(),

  // Location
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type BranchEntity = typeof branches.$inferSelect;
export type CreateBranchEntity = typeof branches.$inferInsert;
