import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { markets } from "./market.schema";

// resellerId points at users.id - a reseller is a users row with
// userType = UserTypeEnums.RESELLER, mirroring reseller_discount_rule_mapper.
export const resellerMarketMapper = pgTable(
  "reseller_market_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resellerId: uuid("reseller_id")
      .notNull()
      .references((): AnyPgColumn => users.id),
    marketId: uuid("market_id")
      .notNull()
      .references((): AnyPgColumn => markets.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
    updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reseller_market_mapper_reseller_market_idx").on(
      table.resellerId,
      table.marketId,
    ),
  ],
);

export type ResellerMarketMapperEntity =
  typeof resellerMarketMapper.$inferSelect;
export type CreateResellerMarketMapperEntity =
  typeof resellerMarketMapper.$inferInsert;
