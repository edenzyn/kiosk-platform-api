import {
  index,
  jsonb,
  pgTable,
  smallint,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../branch/schemas/branch.schema";
import { organizations } from "../organization/schemas/organization.schema";
import { users } from "../user/schemas/user.schema";
import { devices } from "./device.schema";

export const deviceLogs = pgTable(
  "device_logs",
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
    action: smallint("action").notNull(), // DeviceLogActionEnum: 1 = SIGNED_IN, 2 = SIGNED_OUT, 3 = SESSION_REVOKED, 4 = ACTIVATED, 5 = DEACTIVATED, 6 = ADMIN_PANEL_ENTERED, 7 = ADMIN_PANEL_ENTRY_FAILED, 8 = TERMINAL_MAPPED, 9 = TERMINAL_UNMAPPED, 10 = STAFF_LOGIN, 11 = STAFF_LOGIN_FAILED, 12 = STAFF_LOGOUT, 13 = STAFF_SESSION_REVOKED
    performedBy: uuid("performed_by").references((): AnyPgColumn => users.id), // Null when the device did it itself
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("device_logs_device_created_at_idx").on(
      table.deviceId,
      table.createdAt,
    ),
  ],
);

export type DeviceLogEntity = typeof deviceLogs.$inferSelect;
export type CreateDeviceLogEntity = typeof deviceLogs.$inferInsert;
