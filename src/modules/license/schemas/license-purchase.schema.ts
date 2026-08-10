import {
  decimal,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const licensePurchases = pgTable("license_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  resellerId: uuid("reseller_id").references((): AnyPgColumn => users.id),
  quantity: integer("quantity").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  paymentMethod: smallint("payment_method"),
  paymentProvider: smallint("payment_provider"),
  paymentStatus: smallint("payment_status"),
  paymentReference: varchar("payment_reference", { length: 255 }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicensePurchaseEntity = typeof licensePurchases.$inferSelect;
export type CreateLicensePurchaseEntity = typeof licensePurchases.$inferInsert;
