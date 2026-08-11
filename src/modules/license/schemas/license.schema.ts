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
import { users } from "../../user/schemas/user.schema";
import { devices } from "../../device/device.schema";

export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseKey: varchar("license_key", { length: 255 }).unique().notNull(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  deviceId: uuid("device_id").references((): AnyPgColumn => devices.id),
  status: smallint("status").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicenseEntity = typeof licenses.$inferSelect;
export type CreateLicenseEntity = typeof licenses.$inferInsert;
