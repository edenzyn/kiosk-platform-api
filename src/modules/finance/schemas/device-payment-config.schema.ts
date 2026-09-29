import {
  boolean,
  index,
  jsonb,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/schemas/branch.schema";
import { devices } from "../../device/device.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { paymentProviderMarketMappers } from "./payment-provider-market-mapper.schema";

export const devicePaymentConfigs = pgTable(
  "device_payment_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    deviceId: uuid("device_id")
      .notNull()
      .references((): AnyPgColumn => devices.id),
    paymentProviderMarketMapperId: uuid(
      "payment_provider_market_mapper_id",
    ).references((): AnyPgColumn => paymentProviderMarketMappers.id), // Null for providerless methods such as CASH.
    paymentMethod: smallint("payment_method").notNull(), // TenantPaymentMethodEnum: 1 = QR, 2 = CARD, 3 = CASH
    config: jsonb("config"), // Provider-specific configuration; null for providerless methods such as CASH.
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
  },
  (table) => [
    uniqueIndex("device_payment_configs_device_method_idx").on(
      table.deviceId,
      table.paymentMethod,
    ),
    index("device_payment_configs_organization_idx").on(table.organizationId),
    index("device_payment_configs_branch_idx").on(table.branchId),
    index("device_payment_configs_mapper_idx").on(
      table.paymentProviderMarketMapperId,
    ),
  ],
);

export type DevicePaymentConfigEntity =
  typeof devicePaymentConfigs.$inferSelect;
export type CreateDevicePaymentConfigEntity =
  typeof devicePaymentConfigs.$inferInsert;
