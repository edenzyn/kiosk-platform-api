import {
  type AnyPgColumn,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { licenses } from "./license.schema";
import { licensePurchases } from "./license-purchase.schema";
import { users } from "../../user/schemas/user.schema";

export const licenseHistory = pgTable("license_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  eventType: smallint("event_type").notNull(),
  previousStatus: smallint("previous_status"),
  newStatus: smallint("new_status"),
  previousExpiresAt: timestamp("previous_expires_at", { withTimezone: true }),
  newExpiresAt: timestamp("new_expires_at", { withTimezone: true }),
  purchaseId: uuid("purchase_id").references((): AnyPgColumn => licensePurchases.id),
  remarks: text("remarks"),
  performedBy: uuid("performed_by").references((): AnyPgColumn => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicenseHistoryEntity = typeof licenseHistory.$inferSelect;
export type CreateLicenseHistoryEntity = typeof licenseHistory.$inferInsert;
