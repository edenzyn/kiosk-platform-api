import {
  boolean,
  decimal,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { licensePlans } from "../../license/schemas/license-plan.schema";
import { users } from "../../user/schemas/user.schema";
import { markets } from "./market.schema";

export const licensePlanMarketMapper = pgTable(
  "license_plan_market_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: uuid("market_id")
      .notNull()
      .references((): AnyPgColumn => markets.id),
    planId: uuid("plan_id")
      .notNull()
      .references((): AnyPgColumn => licensePlans.id),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
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
    uniqueIndex("license_plan_market_mapper_market_plan_idx").on(
      table.marketId,
      table.planId,
    ),
  ],
);

export type LicensePlanMarketMapperEntity =
  typeof licensePlanMarketMapper.$inferSelect;
export type CreateLicensePlanMarketMapperEntity =
  typeof licensePlanMarketMapper.$inferInsert;
