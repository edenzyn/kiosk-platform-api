import { and, count, eq, sql } from "drizzle-orm";
import type { Database } from "../../config/db";
import { TenantPaymentMethodEnum } from "../../shared/enums/finance/tenant-payment-method.enum";
import { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { ShiftEndTypeEnum } from "../../shared/enums/shift/shift-end-type.enum";
import { ShiftStatusEnum } from "../../shared/enums/shift/shift-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { DatabaseError } from "../../shared/errors/database-error";
import { logger } from "../../shared/utils/core/logger";
import { orderPayments } from "../order/schemas/order-payment.schema";
import { orders } from "../order/schemas/order.schema";
import { staffShifts } from "./schemas/staff-shift.schema";
import type {
  CloseBusinessDayShiftsRepoInput,
  CloseBusinessDayShiftsRepoResult,
  CloseShiftRepoInput,
  CloseShiftRepoResult,
  CreateShiftRepoInput,
  CreateShiftRepoResult,
  FindOpenShiftRepoInput,
  FindOpenShiftRepoResult,
  FindShiftManagersRepoInput,
  FindShiftManagersRepoResult,
  GetShiftTotalsRepoInput,
  GetShiftTotalsRepoResult,
} from "./shift.types";

type Transaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

export class ShiftRepository {
  constructor(private readonly database: Database) {}

  async findOpenShift(
    input: FindOpenShiftRepoInput,
  ): Promise<FindOpenShiftRepoResult> {
    try {
      if (!input.deviceId && !input.userId) {
        throw new Error("A device or a staff member is required");
      }

      const [shift] = await this.database.client
        .select()
        .from(staffShifts)
        .where(
          and(
            eq(staffShifts.status, ShiftStatusEnum.OPEN),
            input.deviceId
              ? eq(staffShifts.deviceId, input.deviceId)
              : undefined,
            input.userId ? eq(staffShifts.userId, input.userId) : undefined,
          ),
        )
        .limit(1);

      return shift ?? null;
    } catch (error) {
      logger.error("[SHIFT_FIND_OPEN_SHIFT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async createShift(
    input: CreateShiftRepoInput,
  ): Promise<CreateShiftRepoResult> {
    try {
      const [shift] = await this.database.client
        .insert(staffShifts)
        .values(input)
        .returning();

      if (!shift) {
        throw new Error("Failed to create shift");
      }

      return shift;
    } catch (error) {
      logger.error("[SHIFT_CREATE_SHIFT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async getShiftTotals(
    input: GetShiftTotalsRepoInput,
  ): Promise<GetShiftTotalsRepoResult> {
    try {
      return await this._getTotals(this.database.client, input.shiftId);
    } catch (error) {
      logger.error("[SHIFT_GET_SHIFT_TOTALS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async closeShift(input: CloseShiftRepoInput): Promise<CloseShiftRepoResult> {
    try {
      return await this.database.client.transaction((tx) =>
        this._closeShift(tx, input),
      );
    } catch (error) {
      logger.error("[SHIFT_CLOSE_SHIFT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async closeBusinessDayShifts(
    input: CloseBusinessDayShiftsRepoInput,
  ): Promise<CloseBusinessDayShiftsRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const openShifts = await tx
          .select({ id: staffShifts.id })
          .from(staffShifts)
          .where(
            and(
              eq(staffShifts.businessDayId, input.businessDayId),
              eq(staffShifts.status, ShiftStatusEnum.OPEN),
            ),
          );

        for (const shift of openShifts) {
          await this._closeShift(tx, {
            id: shift.id,
            endType: ShiftEndTypeEnum.CLOSED_WITH_DAY,
            endedBy: input.endedBy,
            note: input.note,
          });
        }

        return openShifts.length;
      });
    } catch (error) {
      logger.error("[SHIFT_CLOSE_BUSINESS_DAY_SHIFTS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findShiftManagers(
    input: FindShiftManagersRepoInput,
  ): Promise<FindShiftManagersRepoResult> {
    try {
      const search = input.search ? `%${input.search}%` : null;

      // Branch users need the shift permission or branch all-write; an
      // organization-level user needs organization all-write.
      const managersQuery = sql`
        FROM users u
        WHERE u.organization_id = ${input.organizationId}
          AND u.is_active = true
          AND u.user_type = ${UserTypeEnums.NORMAL}
          AND u.id <> ${input.excludeUserId}
          AND (u.branch_id = ${input.branchId} OR u.branch_id IS NULL)
          AND (${search}::text IS NULL OR u.name ILIKE ${search})
          AND EXISTS (
            SELECT 1
            FROM fn_get_user_permission_keys_by_tenant(u.id, u.organization_id, u.branch_id) p
            WHERE (
              u.branch_id IS NOT NULL
              AND p.key IN (${UserPermissions.BRANCH_SHIFT_MANAGE}, ${UserPermissions.BRANCH_ALL_WRITE})
            ) OR (
              u.branch_id IS NULL
              AND p.key = ${UserPermissions.ORGANIZATION_ALL_WRITE}
            )
          )
      `;

      const [managers, totals] = await Promise.all([
        this.database.client.execute<{
          id: string;
          name: string;
          hasPin: boolean;
        }>(
          sql`SELECT u.id, u.name, (u.pin IS NOT NULL) AS "hasPin" ${managersQuery} ORDER BY u.name ASC LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}`,
        ),
        this.database.client.execute<{ total: number }>(
          sql`SELECT COUNT(*)::int AS total ${managersQuery}`,
        ),
      ]);

      return {
        managers: managers.rows,
        total: totals.rows[0]?.total ?? 0,
      };
    } catch (error) {
      logger.error("[SHIFT_FIND_SHIFT_MANAGERS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  /** Closes an open shift and saves its totals; null when it was not open. */
  private async _closeShift(
    tx: Transaction,
    input: CloseShiftRepoInput,
  ): Promise<CloseShiftRepoResult> {
    const [openShift] = await tx
      .select({ id: staffShifts.id })
      .from(staffShifts)
      .where(
        and(
          eq(staffShifts.id, input.id),
          eq(staffShifts.status, ShiftStatusEnum.OPEN),
        ),
      )
      .for("update");

    if (!openShift) return null;

    const totals = await this._getTotals(tx, openShift.id);
    const now = new Date();

    const [closedShift] = await tx
      .update(staffShifts)
      .set({
        status: ShiftStatusEnum.CLOSED,
        endedAt: now,
        endType: input.endType,
        endedBy: input.endedBy,
        note: input.note ?? null,
        endVerifiedBy: input.endVerifiedBy ?? null,
        endVerificationMethod: input.endVerificationMethod ?? null,
        cashOrderCount: totals.cash.orderCount,
        cashAmount: totals.cash.amount,
        qrOrderCount: totals.qr.orderCount,
        qrAmount: totals.qr.amount,
        cardOrderCount: totals.card.orderCount,
        cardAmount: totals.card.amount,
        cancelledOrderCount: totals.cancelled.orderCount,
        cancelledAmount: totals.cancelled.amount,
        updatedAt: now,
      })
      .where(eq(staffShifts.id, openShift.id))
      .returning();

    return closedShift ?? null;
  }

  /** Completed payments per method and cancelled orders linked to the shift. */
  private async _getTotals(
    executor: Database["client"] | Transaction,
    shiftId: string,
  ): Promise<GetShiftTotalsRepoResult> {
    const paymentRows = await executor
      .select({
        paymentMethod: orderPayments.paymentMethod,
        orderCount: count(),
        amount: sql<string>`COALESCE(SUM(${orderPayments.amount}), 0)::decimal(10, 2)`,
      })
      .from(orderPayments)
      .where(
        and(
          eq(orderPayments.shiftId, shiftId),
          eq(orderPayments.paymentStatus, OrderPaymentStatusEnum.COMPLETED),
        ),
      )
      .groupBy(orderPayments.paymentMethod);

    const [cancelled] = await executor
      .select({
        orderCount: count(),
        amount: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)::decimal(10, 2)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.shiftId, shiftId),
          eq(orders.orderStatus, OrderStatusEnum.CANCELLED),
        ),
      );

    const getMethodTotal = (paymentMethod: TenantPaymentMethodEnum) => {
      const row = paymentRows.find(
        (payment) => payment.paymentMethod === paymentMethod,
      );
      return {
        orderCount: row?.orderCount ?? 0,
        amount: row?.amount ?? "0.00",
      };
    };

    return {
      cash: getMethodTotal(TenantPaymentMethodEnum.CASH),
      qr: getMethodTotal(TenantPaymentMethodEnum.QR),
      card: getMethodTotal(TenantPaymentMethodEnum.CARD),
      cancelled: {
        orderCount: cancelled?.orderCount ?? 0,
        amount: cancelled?.amount ?? "0.00",
      },
    };
  }
}
