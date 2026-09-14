import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { markets } from "./market.schema";

export const organizationMarketMapper = pgTable(
  "organization_market_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
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
    uniqueIndex("organization_market_mapper_org_market_idx").on(
      table.organizationId,
      table.marketId,
    ),
  ],
);

export type OrganizationMarketMapperEntity =
  typeof organizationMarketMapper.$inferSelect;
export type CreateOrganizationMarketMapperEntity =
  typeof organizationMarketMapper.$inferInsert;
