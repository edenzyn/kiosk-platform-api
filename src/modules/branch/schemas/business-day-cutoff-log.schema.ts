import {
  index,
  pgTable,
  time,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "../../organization/schemas/organization.schema";
import { users } from "../../user/schemas/user.schema";
import { branches } from "./branch.schema";

export const businessDayCutoffLogs = pgTable(
  "business_day_cutoff_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references((): AnyPgColumn => organizations.id),
    branchId: uuid("branch_id")
      .notNull()
      .references((): AnyPgColumn => branches.id),
    cutoffTime: time("cutoff_time").notNull(), // Branch time zone
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  },
  (table) => [
    index("business_day_cutoff_logs_branch_effective_idx").on(
      table.branchId,
      table.effectiveFrom,
    ),
    index("business_day_cutoff_logs_organization_idx").on(table.organizationId),
  ],
);

export type BusinessDayCutoffLogEntity =
  typeof businessDayCutoffLogs.$inferSelect;
export type CreateBusinessDayCutoffLogEntity =
  typeof businessDayCutoffLogs.$inferInsert;
