import {
  boolean,
  decimal,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import { users } from "../../user/schemas/user.schema";

export const licensePricing = pgTable("license_pricing", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceType: smallint("device_type").default(DeviceTypeEnum.KIOSK).notNull(),
  durationDays: integer("duration_days").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
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

export type LicensePricingEntity = typeof licensePricing.$inferSelect;
export type CreateLicensePricingEntity = typeof licensePricing.$inferInsert;
