import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const licensePlans = pgTable("license_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  deviceType: integer("device_type").notNull(), // DeviceTypeEnum: 1 = KIOSK, 2 = COUNTER, 3 = KDS, 4 = DIGITAL_DISPLAY
  durationDays: integer("duration_days").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicensePlanEntity = typeof licensePlans.$inferSelect;
export type CreateLicensePlanEntity = typeof licensePlans.$inferInsert;
