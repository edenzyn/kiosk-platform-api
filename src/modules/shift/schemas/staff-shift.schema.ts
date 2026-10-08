import { sql } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { ShiftStatusEnum } from "../../../shared/enums/shift/shift-status.enum";
import { branches } from "../../branch/schemas/branch.schema";
import { businessDays } from "../../business-day/schemas/business-day.schema";
import { devices } from "../../device/device.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const staffShifts = pgTable(
  "staff_shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    businessDayId: uuid("business_day_id")
      .notNull()
      .references((): AnyPgColumn => businessDays.id),
    deviceId: uuid("device_id")
      .notNull()
      .references((): AnyPgColumn => devices.id),
    deviceType: smallint("device_type").notNull(), // DeviceTypeEnum: 1 = KIOSK, 2 = COUNTER, 3 = KDS, 4 = CDS; copied from the device when the shift starts
    userId: uuid("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id), // the staff member working the shift
    status: smallint("status").default(ShiftStatusEnum.OPEN).notNull(), // ShiftStatusEnum: 1 = OPEN, 2 = CLOSED
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endType: smallint("end_type"), // ShiftEndTypeEnum: 1 = ENDED_BY_STAFF, 2 = FORCE_CLOSED, 3 = CLOSED_WITH_DAY
    endedBy: uuid("ended_by").references((): AnyPgColumn => users.id),
    note: text("note"), // closing note
    // Cash drawer; empty on a device that holds no cash
    currencyCode: varchar("currency_code", { length: 3 }), // snapshot of the branch market currency
    openingCash: decimal("opening_cash", { precision: 10, scale: 2 }),
    // Who confirmed the start and the end: the staff member, or a shift manager
    startVerifiedBy: uuid("start_verified_by").references(
      (): AnyPgColumn => users.id,
    ),
    startVerificationMethod: smallint("start_verification_method"), // ManagerVerificationMethodEnum: 1 = PIN_OR_PASSWORD, 2 = OTP; empty when the staff member confirmed alone
    endVerifiedBy: uuid("end_verified_by").references(
      (): AnyPgColumn => users.id,
    ),
    endVerificationMethod: smallint("end_verification_method"), // ManagerVerificationMethodEnum: 1 = PIN_OR_PASSWORD, 2 = OTP; empty when the staff member confirmed alone
    // Totals saved when the shift closes; empty while it is open
    cashOrderCount: integer("cash_order_count"),
    cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }),
    qrOrderCount: integer("qr_order_count"),
    qrAmount: decimal("qr_amount", { precision: 10, scale: 2 }),
    cardOrderCount: integer("card_order_count"),
    cardAmount: decimal("card_amount", { precision: 10, scale: 2 }),
    cancelledOrderCount: integer("cancelled_order_count"),
    cancelledAmount: decimal("cancelled_amount", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("staff_shifts_device_open_idx")
      .on(table.deviceId)
      .where(sql`${table.status} = 1`),
    uniqueIndex("staff_shifts_user_open_idx")
      .on(table.userId)
      .where(sql`${table.status} = 1`),
    index("staff_shifts_business_day_status_idx").on(
      table.businessDayId,
      table.status,
    ),
    index("staff_shifts_branch_started_at_idx").on(
      table.branchId,
      table.startedAt,
    ),
  ],
);

export type StaffShiftEntity = typeof staffShifts.$inferSelect;
export type CreateStaffShiftEntity = typeof staffShifts.$inferInsert;
