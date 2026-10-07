import {
  boolean,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_PRIMARY_COLOR } from "../../../shared/constants/theme.constants";
import { ManagerVerificationMethodEnum } from "../../../shared/enums/shift/manager-verification-method.enum";
import { ShiftVerifierEnum } from "../../../shared/enums/shift/shift-verifier.enum";
import { branches } from "./branch.schema";

export const branchSettings = pgTable("branch_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => branches.id),
  logo: varchar("logo", { length: 255 }),
  primaryColor: varchar("primary_color", { length: 20 })
    .notNull()
    .default(DEFAULT_PRIMARY_COLOR),
  languageCode: varchar("language_code", { length: 10 })
    .notNull()
    .default("en"),
  timezone: varchar("timezone", { length: 100 })
    .notNull()
    .default("Asia/Kolkata"),
  isCashPaymentEnabled: boolean("is_cash_payment_enabled")
    .default(true)
    .notNull(),
  shiftVerifier: smallint("shift_verifier")
    .default(ShiftVerifierEnum.STAFF)
    .notNull(), // ShiftVerifierEnum: 1 = STAFF, 2 = SHIFT_MANAGER
  managerVerificationMethod: smallint("manager_verification_method")
    .default(ManagerVerificationMethodEnum.PIN_OR_PASSWORD)
    .notNull(), // ManagerVerificationMethodEnum: 1 = PIN_OR_PASSWORD, 2 = OTP
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BranchSettingsEntity = typeof branchSettings.$inferSelect;
export type CreateBranchSettingsEntity = typeof branchSettings.$inferInsert;
