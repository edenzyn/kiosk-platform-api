import {
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { licenseTransactions } from "./license-transaction.schema";
import { users } from "../../user/schemas/user.schema";
import { licensePlans } from "./license-plan.schema";
import { licenses } from "./license.schema";

export const licenseHistory = pgTable("license_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  eventType: smallint("event_type").notNull(), // LicenseHistoryEventTypeEnum: 1 = PURCHASE, 2 = ACTIVATION, 3 = ASSIGNMENT, 4 = DEACTIVATION, 5 = REVOCATION, 6 = EXPIRATION, 7 = EXTEND, 8 = GRACE_PERIOD, 9 = REDEMPTION_CODE_GENERATED, 10 = REDEEMED, 11 = REDEEM_CODE_REVOKED, 12 = REDEEM_CODE_EXPIRED, 13 = REDEMPTION_VERIFIED
  targetEntityType: smallint("target_entity_type")
    .notNull()
    .default(LicenseHistoryTargetEntityTypeEnum.NORMAL), // LicenseHistoryTargetEntityTypeEnum: 1 = NORMAL, 2 = RESELLER, 3 = COMMON
  previousStatus: smallint("previous_status"), // LicenseStatusEnum: 1 = AVAILABLE, 2 = ACTIVE, 3 = GRACE_PERIOD, 4 = EXPIRED, 5 = REVOKED
  newStatus: smallint("new_status"), // LicenseStatusEnum: 1 = AVAILABLE, 2 = ACTIVE, 3 = GRACE_PERIOD, 4 = EXPIRED, 5 = REVOKED
  previousPlanId: uuid("previous_plan_id").references(
    (): AnyPgColumn => licensePlans.id,
  ),
  newPlanId: uuid("new_plan_id").references(
    (): AnyPgColumn => licensePlans.id,
  ),
  previousExpiresAt: timestamp("previous_expires_at", { withTimezone: true }),
  newExpiresAt: timestamp("new_expires_at", { withTimezone: true }),
  transactionId: uuid("transaction_id").references(
    (): AnyPgColumn => licenseTransactions.id,
  ),
  remarks: text("remarks"),
  performedBy: uuid("performed_by").references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseHistoryEntity = typeof licenseHistory.$inferSelect;
export type CreateLicenseHistoryEntity = typeof licenseHistory.$inferInsert;
