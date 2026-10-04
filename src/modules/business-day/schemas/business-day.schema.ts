import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branches } from "../../branch/schemas/branch.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";

export const businessDays = pgTable(
  "business_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    businessDate: date("business_date", { mode: "string" }).notNull(), // Branch time zone; the date the manager opened it on
    status: smallint("status").default(1).notNull(), // BusinessDayStatusEnum: 1 = OPEN, 2 = CLOSED
    lastTokenNumber: integer("last_token_number").default(0).notNull(), // Last token handed out; the next order gets this + 1
    openedAt: timestamp("opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    openedBy: uuid("opened_by")
      .notNull()
      .references((): AnyPgColumn => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references((): AnyPgColumn => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_days_branch_date_idx").on(
      table.branchId,
      table.businessDate,
    ),
    uniqueIndex("business_days_branch_open_idx")
      .on(table.branchId)
      .where(sql`${table.status} = 1`),
    index("business_days_status_idx").on(table.status),
    index("business_days_organization_date_idx").on(
      table.organizationId,
      table.businessDate,
    ),
  ],
);

export type BusinessDayEntity = typeof businessDays.$inferSelect;
export type CreateBusinessDayEntity = typeof businessDays.$inferInsert;
