import {
  index,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { NotificationChannelEnum } from "../../../shared/enums/notification/notification-channel.enum";
import type { OneTimeTokenTypeEnum } from "../../../shared/enums/one-time-token/one-time-token-type.enum";
import { users } from "../../user/schemas/user.schema";

export const oneTimeTokens = pgTable(
  "one_time_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: smallint("type").$type<OneTimeTokenTypeEnum>().notNull(),
    channel: smallint("channel").$type<NotificationChannelEnum>().notNull(),
    /**
     * Where the code was delivered. For contact-change flows this doubles as
     * the pending new email / mobile applied once the code is verified.
     */
    destination: varchar("destination", { length: 255 }).notNull(),
    /** HMAC-SHA256 of the code — never the code itself. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    attemptCount: smallint("attempt_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("one_time_tokens_user_id_type_created_at_idx").on(
      table.userId,
      table.type,
      table.createdAt,
    ),
    index("one_time_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export type OneTimeTokenEntity = typeof oneTimeTokens.$inferSelect;
export type CreateOneTimeTokenEntity = typeof oneTimeTokens.$inferInsert;
