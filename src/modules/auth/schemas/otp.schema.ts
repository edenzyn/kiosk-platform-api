import {
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const otps = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    targetType: smallint("target_type").notNull(), // 1=MOBILE, 2=EMAIL
    target: varchar("target", { length: 255 }).notNull(),
    otp: varchar("otp", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("otps_target_idx").on(table.target, table.targetType),
    index("otps_user_id_idx").on(table.userId),
  ],
);

export type CreateOtpEntity = typeof otps.$inferInsert;
export type OtpEntity = typeof otps.$inferSelect;
