import {
  type AnyPgColumn,
  boolean,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { licenses } from "./license.schema";
import { users } from "../../user/schemas/user.schema";

export const licenseResellerMapper = pgTable("license_reseller_mapper", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  resellerId: uuid("reseller_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicenseResellerMapperEntity = typeof licenseResellerMapper.$inferSelect;
export type CreateLicenseResellerMapperEntity = typeof licenseResellerMapper.$inferInsert;
