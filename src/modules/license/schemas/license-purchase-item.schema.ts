import {
  type AnyPgColumn,
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { licensePurchases } from "./license-purchase.schema";
import { licenses } from "./license.schema";

export const licensePurchaseItems = pgTable("license_purchase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references((): AnyPgColumn => licensePurchases.id),
  licenseId: uuid("license_id")
    .notNull()
    .references((): AnyPgColumn => licenses.id),
  durationDays: integer("duration_days").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type LicensePurchaseItemEntity = typeof licensePurchaseItems.$inferSelect;
export type CreateLicensePurchaseItemEntity = typeof licensePurchaseItems.$inferInsert;
