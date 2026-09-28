import {
  boolean,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../../user/schemas/user.schema";

export const paymentProviders = pgTable(
  "payment_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    type: smallint("type").notNull(), // PaymentProviderTypeEnum
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
  (table) => [uniqueIndex("payment_providers_type_idx").on(table.type)],
);

export type PaymentProviderEntity = typeof paymentProviders.$inferSelect;
export type CreatePaymentProviderEntity = typeof paymentProviders.$inferInsert;
