import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "../../config/db";
import { BusinessDayActionEnum } from "../../shared/enums/business-day/business-day-action.enum";
import { BusinessDayStatusEnum } from "../../shared/enums/business-day/business-day-status.enum";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { ShiftStatusEnum } from "../../shared/enums/shift/shift-status.enum";
import { DatabaseError } from "../../shared/errors/database-error";
import { logger } from "../../shared/utils/core/logger";
import { orders } from "../order/schemas/order.schema";
import { staffShifts } from "../shift/schemas/staff-shift.schema";
import { users } from "../user/schemas/user.schema";
import type {
  CloseBusinessDayRepoInput,
  CloseBusinessDayRepoResult,
  CountActiveOrdersRepoInput,
  FindBusinessDayByDateRepoInput,
  FindBusinessDayByDateRepoResult,
  FindBusinessDayLogsRepoInput,
  FindBusinessDayLogsRepoResult,
  FindBusinessDaysRepoInput,
  FindBusinessDaysRepoResult,
  FindBusinessDaySummaryRepoInput,
  FindBusinessDaySummaryRepoResult,
  FindOneBusinessDayRepoInput,
  FindOneBusinessDayRepoResult,
  FindOpenBusinessDayRepoInput,
  FindOpenBusinessDayRepoResult,
  OpenBusinessDayRepoInput,
  OpenBusinessDayRepoResult,
  SetOrderingPausedRepoInput,
  SetOrderingPausedRepoResult,
} from "./business-day.types";
import { businessDayLogs } from "./schemas/business-day-log.schema";
import { businessDays } from "./schemas/business-day.schema";

const openedByUser = alias(users, "opened_by_user");
const closedByUser = alias(users, "closed_by_user");

const businessDaySummaryFields = {
  id: businessDays.id,
  businessDate: businessDays.businessDate,
  status: businessDays.status,
  isOrderingPaused: businessDays.isOrderingPaused,
  openedAt: businessDays.openedAt,
  openedBy: { id: openedByUser.id, name: openedByUser.name },
  closedAt: businessDays.closedAt,
  closedBy: { id: closedByUser.id, name: closedByUser.name },
  shiftCount: sql<number>`(
    select count(*)::int
    from ${staffShifts}
    where ${staffShifts.businessDayId} = ${businessDays.id}
  )`,
  openShiftCount: sql<number>`(
    select count(*)::int
    from ${staffShifts}
    where ${staffShifts.businessDayId} = ${businessDays.id}
      and ${staffShifts.status} = ${ShiftStatusEnum.OPEN}
  )`,
};

export class BusinessDayRepository {
  constructor(private readonly database: Database) {}

  async findOpenDay(
    input: FindOpenBusinessDayRepoInput,
  ): Promise<FindOpenBusinessDayRepoResult> {
    try {
      const [day] = await this.database.client
        .select()
        .from(businessDays)
        .where(
          and(
            eq(businessDays.branchId, input.branchId),
            eq(businessDays.status, BusinessDayStatusEnum.OPEN),
          ),
        )
        .limit(1);

      return day ?? null;
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_OPEN_DAY_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findOneByDate(
    input: FindBusinessDayByDateRepoInput,
  ): Promise<FindBusinessDayByDateRepoResult> {
    try {
      const [day] = await this.database.client
        .select()
        .from(businessDays)
        .where(
          and(
            eq(businessDays.branchId, input.branchId),
            eq(businessDays.businessDate, input.businessDate),
          ),
        )
        .limit(1);

      return day ?? null;
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_ONE_BY_DATE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findSummary(
    input: FindBusinessDaySummaryRepoInput,
  ): Promise<FindBusinessDaySummaryRepoResult> {
    try {
      const [day] = await this.database.client
        .select(businessDaySummaryFields)
        .from(businessDays)
        .innerJoin(openedByUser, eq(businessDays.openedBy, openedByUser.id))
        .leftJoin(closedByUser, eq(businessDays.closedBy, closedByUser.id))
        .where(eq(businessDays.id, input.id))
        .limit(1);

      return day ?? null;
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_SUMMARY_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findOne(
    input: FindOneBusinessDayRepoInput,
  ): Promise<FindOneBusinessDayRepoResult> {
    try {
      const [day] = await this.database.client
        .select()
        .from(businessDays)
        .where(
          and(
            eq(businessDays.id, input.id),
            eq(businessDays.organizationId, input.organizationId),
            eq(businessDays.branchId, input.branchId),
          ),
        )
        .limit(1);

      return day ?? null;
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_ONE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async openDay(
    input: OpenBusinessDayRepoInput,
  ): Promise<OpenBusinessDayRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        // Serialises opening and closing per branch for the rest of the transaction.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`business-day:${input.branchId}`}))`,
        );

        const now = new Date();

        if (input.closeDayId) {
          const [closedDay] = await tx
            .update(businessDays)
            .set({
              status: BusinessDayStatusEnum.CLOSED,
              isOrderingPaused: false,
              closedAt: now,
              closedBy: input.performedBy,
              updatedAt: now,
            })
            .where(
              and(
                eq(businessDays.id, input.closeDayId),
                eq(businessDays.status, BusinessDayStatusEnum.OPEN),
              ),
            )
            .returning({ id: businessDays.id });

          if (closedDay) {
            await tx.insert(businessDayLogs).values({
              businessDayId: closedDay.id,
              action: BusinessDayActionEnum.CLOSED,
              performedBy: input.performedBy,
            });
          }
        }

        const [stillOpen] = await tx
          .select({ id: businessDays.id })
          .from(businessDays)
          .where(
            and(
              eq(businessDays.branchId, input.branchId),
              eq(businessDays.status, BusinessDayStatusEnum.OPEN),
            ),
          )
          .limit(1);

        if (stillOpen) {
          throw new Error("A business day is already open");
        }

        const [existing] = await tx
          .select({ id: businessDays.id })
          .from(businessDays)
          .where(
            and(
              eq(businessDays.branchId, input.branchId),
              eq(businessDays.businessDate, input.businessDate),
            ),
          )
          .limit(1);

        const [day] = existing
          ? await tx
              .update(businessDays)
              .set({
                status: BusinessDayStatusEnum.OPEN,
                isOrderingPaused: false,
                closedAt: null,
                closedBy: null,
                updatedAt: now,
              })
              .where(eq(businessDays.id, existing.id))
              .returning()
          : await tx
              .insert(businessDays)
              .values({
                organizationId: input.organizationId,
                branchId: input.branchId,
                businessDate: input.businessDate,
                status: BusinessDayStatusEnum.OPEN,
                openedAt: now,
                openedBy: input.performedBy,
              })
              .returning();

        if (!day) throw new Error("Failed to open business day");

        const action = existing
          ? BusinessDayActionEnum.REOPENED
          : BusinessDayActionEnum.OPENED;

        await tx.insert(businessDayLogs).values({
          businessDayId: day.id,
          action,
          performedBy: input.performedBy,
        });

        return { day, action };
      });
    } catch (error) {
      logger.error("[BUSINESS_DAY_OPEN_DAY_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async closeDay(
    input: CloseBusinessDayRepoInput,
  ): Promise<CloseBusinessDayRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const now = new Date();

        const [day] = await tx
          .update(businessDays)
          .set({
            status: BusinessDayStatusEnum.CLOSED,
            isOrderingPaused: false,
            closedAt: now,
            closedBy: input.performedBy,
            updatedAt: now,
          })
          .where(
            and(
              eq(businessDays.id, input.id),
              eq(businessDays.status, BusinessDayStatusEnum.OPEN),
            ),
          )
          .returning();

        if (!day) return null;

        await tx.insert(businessDayLogs).values({
          businessDayId: day.id,
          action: BusinessDayActionEnum.CLOSED,
          performedBy: input.performedBy,
        });

        return day;
      });
    } catch (error) {
      logger.error("[BUSINESS_DAY_CLOSE_DAY_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async setOrderingPaused(
    input: SetOrderingPausedRepoInput,
  ): Promise<SetOrderingPausedRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const [day] = await tx
          .update(businessDays)
          .set({ isOrderingPaused: input.isPaused, updatedAt: new Date() })
          .where(
            and(
              eq(businessDays.id, input.id),
              eq(businessDays.status, BusinessDayStatusEnum.OPEN),
              eq(businessDays.isOrderingPaused, !input.isPaused),
            ),
          )
          .returning();

        if (!day) return null;

        await tx.insert(businessDayLogs).values({
          businessDayId: day.id,
          action: input.isPaused
            ? BusinessDayActionEnum.ORDERS_PAUSED
            : BusinessDayActionEnum.ORDERS_RESUMED,
          performedBy: input.performedBy,
        });

        return day;
      });
    } catch (error) {
      logger.error("[BUSINESS_DAY_SET_ORDERING_PAUSED_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async countActiveOrders(input: CountActiveOrdersRepoInput): Promise<number> {
    try {
      const [row] = await this.database.client
        .select({ total: count() })
        .from(orders)
        .where(
          and(
            eq(orders.businessDayId, input.businessDayId),
            inArray(orders.orderStatus, [
              OrderStatusEnum.PLACED,
              OrderStatusEnum.PREPARING,
              OrderStatusEnum.READY,
            ]),
          ),
        );

      return Number(row?.total ?? 0);
    } catch (error) {
      logger.error("[BUSINESS_DAY_COUNT_ACTIVE_ORDERS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findDays(
    input: FindBusinessDaysRepoInput,
  ): Promise<FindBusinessDaysRepoResult> {
    try {
      const conditions = and(
        eq(businessDays.organizationId, input.organizationId),
        eq(businessDays.branchId, input.branchId),
        input.fromDate
          ? gte(businessDays.businessDate, input.fromDate)
          : undefined,
        input.toDate ? lte(businessDays.businessDate, input.toDate) : undefined,
      );
      const orderFn = input.sortOrder === SortingOrderEnum.ASC ? asc : desc;

      const [rows, [totalRow]] = await Promise.all([
        this.database.client
          .select(businessDaySummaryFields)
          .from(businessDays)
          .innerJoin(openedByUser, eq(businessDays.openedBy, openedByUser.id))
          .leftJoin(closedByUser, eq(businessDays.closedBy, closedByUser.id))
          .where(conditions)
          .orderBy(orderFn(businessDays.businessDate))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        this.database.client
          .select({ total: count() })
          .from(businessDays)
          .where(conditions),
      ]);

      return { businessDays: rows, total: Number(totalRow?.total ?? 0) };
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_DAYS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findDayLogs(
    input: FindBusinessDayLogsRepoInput,
  ): Promise<FindBusinessDayLogsRepoResult> {
    try {
      return await this.database.client
        .select({
          id: businessDayLogs.id,
          action: businessDayLogs.action,
          performedBy: { id: users.id, name: users.name },
          createdAt: businessDayLogs.createdAt,
        })
        .from(businessDayLogs)
        .innerJoin(users, eq(businessDayLogs.performedBy, users.id))
        .where(eq(businessDayLogs.businessDayId, input.businessDayId))
        .orderBy(asc(businessDayLogs.createdAt));
    } catch (error) {
      logger.error("[BUSINESS_DAY_FIND_DAY_LOGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }
}
