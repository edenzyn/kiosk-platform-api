import {
  boolean,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import { branches } from "../../branch/schemas/branch.schema";
import { devices } from "../../device/device.schema";
import { markets } from "../../market/schemas/market.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { licensePlans } from "./license-plan.schema";

export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseKey: text("license_key").notNull().unique(), // encrypted
  licenseKeyHash: text("license_key_hash").notNull().unique(), // hashed
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  branchId: uuid("branch_id").references((): AnyPgColumn => branches.id),
  deviceId: uuid("device_id").references((): AnyPgColumn => devices.id),
  marketId: uuid("market_id")
    .notNull()
    .references((): AnyPgColumn => markets.id),
  currentPlanId: uuid("current_plan_id")
    .notNull()
    .references((): AnyPgColumn => licensePlans.id),
  isRedeemed: boolean("is_redeemed").default(false).notNull(),
  deviceType: smallint("device_type").default(DeviceTypeEnum.KIOSK).notNull(), // DeviceTypeEnum: 1 = KIOSK, 2 = COUNTER, 3 = KDS, 4 = DIGITAL_DISPLAY
  status: smallint("status").notNull(), // LicenseStatusEnum: 1 = AVAILABLE, 2 = ACTIVE, 3 = GRACE_PERIOD, 4 = EXPIRED, 5 = REVOKED
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
