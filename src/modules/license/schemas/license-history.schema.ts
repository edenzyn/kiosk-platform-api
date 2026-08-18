import {
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { licenseTransactions } from "./license-transaction.schema";
import { users } from "../../user/schemas/user.schema";
import { licenses } from "./license.schema";

export const licenseHistory = pgTable("license_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  eventType: smallint("event_type").notNull(),
  // UserTypeEnums - which audience this row belongs to (org vs reseller vs
  // platform), so the same table can be filtered per portal when listing
  // history. Not who performed it - that's performedBy.
  targetEntityType: smallint("target_entity_type").notNull(),
  previousStatus: smallint("previous_status"),
  newStatus: smallint("new_status"),
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
