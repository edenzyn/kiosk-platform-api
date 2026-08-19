import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { devices } from "../../device/device.schema";

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .references(() => devices.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceName: varchar("device_name", { length: 150 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_device_id_idx").on(table.deviceId),
  ],
);

export type CreateAuthSessionEntity = typeof authSessions.$inferInsert;
export type AuthSessionEntity = typeof authSessions.$inferSelect;
