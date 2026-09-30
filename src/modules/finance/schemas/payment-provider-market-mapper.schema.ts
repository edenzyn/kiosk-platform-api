import {
  boolean,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { markets } from "../../market/schemas/market.schema";
import { users } from "../../user/schemas/user.schema";
import { paymentProviders } from "./payment-provider.schema";

export const paymentProviderMarketMappers = pgTable(
  "payment_provider_market_mappers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references((): AnyPgColumn => paymentProviders.id),
    marketId: uuid("market_id")
      .notNull()
      .references((): AnyPgColumn => markets.id),
    paymentMethod: smallint("payment_method").notNull(), // TenantPaymentMethodEnum: 1 = QR, 2 = CARD (CASH is never mapped)
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
    uniqueIndex(
      "payment_provider_market_mappers_provider_market_method_idx",
    ).on(table.providerId, table.marketId, table.paymentMethod),
  ],
);

export type PaymentProviderMarketMapperEntity =
  typeof paymentProviderMarketMappers.$inferSelect;
export type CreatePaymentProviderMarketMapperEntity =
  typeof paymentProviderMarketMappers.$inferInsert;
