import {
  index,
  pgTable,
  smallint,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { businessDays } from "./business-day.schema";

export const businessDayLogs = pgTable(
  "business_day_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessDayId: uuid("business_day_id")
      .notNull()
      .references((): AnyPgColumn => businessDays.id),
    action: smallint("action").notNull(), // BusinessDayActionEnum: 1 = OPENED, 2 = CLOSED, 3 = REOPENED, 4 = ORDERS_PAUSED, 5 = ORDERS_RESUMED
    performedBy: uuid("performed_by")
      .notNull()
      .references((): AnyPgColumn => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("business_day_logs_day_created_at_idx").on(
      table.businessDayId,
      table.createdAt,
    ),
  ],
);

export type BusinessDayLogEntity = typeof businessDayLogs.$inferSelect;
export type CreateBusinessDayLogEntity = typeof businessDayLogs.$inferInsert;
