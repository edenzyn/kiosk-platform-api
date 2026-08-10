import {
  type AnyPgColumn,
  boolean,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "../organization/organization.schema";
import { branches } from "../branch/branch.schema";
import { users } from "../user/schemas/user.schema";

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id),
  branchId: uuid("branch_id")
    .notNull()
    .references((): AnyPgColumn => branches.id),
  deviceCode: varchar("device_code", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  pin: varchar("pin", { length: 255 }),
  deviceType: smallint("device_type"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
});

export type DeviceEntity = typeof devices.$inferSelect;
export type CreateDeviceEntity = typeof devices.$inferInsert;

export type DeviceWithBranchEntity = DeviceEntity & {
  branchName: string | null;
};
