import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/schemas/branch.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import type { TenantPaymentConfigValues } from "../types/payment.types";
import { paymentProviderMarketMappers } from "./payment-provider-market-mapper.schema";

export const tenantPaymentConfigs = pgTable(
  "tenant_payment_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    paymentProviderMarketMapperId: uuid("payment_provider_market_mapper_id")
      .notNull()
      .references((): AnyPgColumn => paymentProviderMarketMappers.id),
    config: jsonb("config").$type<TenantPaymentConfigValues>().notNull(), // PhonePeQrPaymentConfig | PineLabsCardPaymentConfig
    lastConnectionTest: timestamp("last_connection_test", {
      withTimezone: true,
    }),
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
    uniqueIndex("tenant_payment_configs_branch_provider_method_idx").on(
      table.branchId,
      table.paymentProviderMarketMapperId,
    ),
    index("tenant_payment_configs_organization_idx").on(table.organizationId),
    index("tenant_payment_configs_branch_idx").on(table.branchId),
  ],
);

export type TenantPaymentConfigEntity =
  typeof tenantPaymentConfigs.$inferSelect;
export type CreateTenantPaymentConfigEntity =
  typeof tenantPaymentConfigs.$inferInsert;
