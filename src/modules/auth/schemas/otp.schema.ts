import {
  index,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { NotificationChannelEnum } from "../../../shared/enums/notification/notification-channel.enum";
import type { OtpTypeEnum } from "../../../shared/enums/otp/otp-type.enum";
import { users } from "../../user/schemas/user.schema";

export const otps = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: smallint("type").$type<OtpTypeEnum>().notNull(),
    channel: smallint("channel").$type<NotificationChannelEnum>().notNull(),
    /**
     * Where the code was delivered. For contact-change flows this doubles as
     * the pending new email / mobile applied once the code is verified.
     */
    destination: varchar("destination", { length: 255 }).notNull(),
    /** HMAC-SHA256 of the code — never the code itself. */
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attemptCount: smallint("attempt_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("otps_user_id_type_created_at_idx").on(
      table.userId,
      table.type,
      table.createdAt,
    ),
    index("otps_expires_at_idx").on(table.expiresAt),
  ],
);

export type OtpEntity = typeof otps.$inferSelect;
export type CreateOtpEntity = typeof otps.$inferInsert;
