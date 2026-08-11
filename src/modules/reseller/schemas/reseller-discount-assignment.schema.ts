import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";
import { resellerDiscountRules } from "./reseller-discount-rule.schema";

export const resellerDiscountRuleMapper = pgTable(
  "reseller_discount_rule_mapper",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resellerId: uuid("reseller_id")
      .notNull()
      .references((): AnyPgColumn => users.id),
    discountRuleId: uuid("discount_rule_id")
      .notNull()
      .references((): AnyPgColumn => resellerDiscountRules.id),
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
);

export type ResellerDiscountRuleMapperEntity =
  typeof resellerDiscountRuleMapper.$inferSelect;
export type CreateResellerDiscountRuleMapperEntity =
  typeof resellerDiscountRuleMapper.$inferInsert;
