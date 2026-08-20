import {
  decimal,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const licenseRedemptionCodes = pgTable("license_redemption_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  resellerId: uuid("reseller_id")
    .notNull()
    .references((): AnyPgColumn => users.id),
  redeemCode: text("redeem_code").notNull(), // encrypted
  redeemCodeHash: text("redeem_code_hash").notNull().unique(), // hashed
  status: smallint("status").notNull(), // LicenseRedemptionStatusEnum
  soldPrice: decimal("sold_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  redeemExpiresAt: timestamp("redeem_expires_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  claimedByOrganizationId: uuid("claimed_by_organization_id").references(
    (): AnyPgColumn => organizations.id,
  ),
  claimedByUserId: uuid("claimed_by_user_id").references(
    (): AnyPgColumn => users.id,
  ),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type LicenseRedemptionCodeEntity =
  typeof licenseRedemptionCodes.$inferSelect;
export type CreateLicenseRedemptionCodeEntity =
  typeof licenseRedemptionCodes.$inferInsert;
