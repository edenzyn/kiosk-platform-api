import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../branch/schemas/branch.schema";
import { organizations } from "../organization/schemas/organization.schema";
import { users } from "../user/schemas/user.schema";
import { devices } from "./device.schema";

export const deviceStaffSessions = pgTable(
  "device_staff_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    deviceId: uuid("device_id")
      .notNull()
      .references((): AnyPgColumn => devices.id),
    userId: uuid("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 of the current refresh JWT; replaced on every refresh
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Fixed at sign-in; refreshing does not extend it
    endedAt: timestamp("ended_at", { withTimezone: true }), // Set on sign-out, replacement by another staff member, or device sign-out
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("device_staff_sessions_device_id_idx").on(table.deviceId),
    index("device_staff_sessions_user_id_idx").on(table.userId),
  ],
);

export type DeviceStaffSessionEntity = typeof deviceStaffSessions.$inferSelect;
export type CreateDeviceStaffSessionEntity =
  typeof deviceStaffSessions.$inferInsert;
