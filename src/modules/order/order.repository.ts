import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/core/logger";
import { buildOrderNumber } from "../../shared/utils/order/order-number.helper";
import { businessDays } from "../business-day/schemas/business-day.schema";
import { branchSettings } from "../branch/schemas/branch-settings.schema";
import { branches } from "../branch/schemas/branch.schema";
import type {
  CompletePendingPaymentRepoInput,
  CompletePendingPaymentRepoResult,
  CountBusinessDayOrdersByStatusRepoInput,
  CountBusinessDayOrdersByStatusRepoResult,
  CreateOrderPaymentRepoInput,
  CreateOrderPaymentRepoResult,
  CreateOrderRepoInput,
  CreateOrderRepoResult,
  FailPendingPaymentRepoInput,
  FailPendingPaymentRepoResult,
  FindLatestOrderPaymentRepoInput,
  FindLatestOrderPaymentRepoResult,
  FindOneOrderPaymentRepoInput,
  FindOneOrderPaymentRepoResult,
  FindOrderByIdempotencyKeyRepoInput,
  FindOrderByIdempotencyKeyRepoResult,
  FindOrdersRepoInput,
  FindOrdersRepoResult,
  UpdateOrderPaymentRepoInput,
  UpdateOrderPaymentRepoResult,
  UpdateOrderRepoInput,
  UpdateOrderRepoResult,
} from "./order.types";
import { orderItemModifiers } from "./schemas/order-item-modifier.schema";
import { orderItems } from "./schemas/order-item.schema";
import { orderPayments } from "./schemas/order-payment.schema";
import { orderStatusLogs } from "./schemas/order-status-log.schema";
import { orderTaxes } from "./schemas/order-tax.schema";
import { orderNumberSequence, orders } from "./schemas/order.schema";

export class OrderRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? ORDER SCHEMA METHODS
  // ========================================
  async findOneByIdempotencyKey(
    input: FindOrderByIdempotencyKeyRepoInput,
  ): Promise<FindOrderByIdempotencyKeyRepoResult> {
    try {
      const [order] = await this.database.client
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.deviceId, input.deviceId),
            eq(orders.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);

      return (await order) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_FIND_ONE_BY_IDEMPOTENCY_KEY_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async createOrder(
    input: CreateOrderRepoInput,
  ): Promise<CreateOrderRepoResult> {
    try {
      const { order, items, taxes } = input;

      return await this.database.client.transaction(async (tx) => {
        // Takes the next token on the day; the row lock serialises token numbering.
        const [day] = await tx
          .update(businessDays)
          .set({ lastTokenNumber: sql`${businessDays.lastTokenNumber} + 1` })
          .where(eq(businessDays.id, order.businessDayId))
          .returning({ lastTokenNumber: businessDays.lastTokenNumber });

        if (!day) throw new Error("Business day not found");

        const tokenNumber = day.lastTokenNumber;

        const { rows } = await tx.execute<{ value: string }>(
          sql`select nextval(${orderNumberSequence.seqName}::regclass) as value`,
        );
        const sequenceValue = rows[0]?.value;
        if (!sequenceValue) {
          throw new Error("Failed to generate order number");
        }

        const [created] = await tx
          .insert(orders)
          .values({
            ...order,
            tokenNumber,
            orderNumber: buildOrderNumber(
              BigInt(sequenceValue),
              input.orderDateLabel,
            ),
          })
          .returning();

        if (!created) {
          throw new Error("Failed to create order");
        }

        for (const { modifiers, ...item } of items) {
          const [orderItem] = await tx
            .insert(orderItems)
            .values({ ...item, orderId: created.id })
            .returning({ id: orderItems.id });

          if (!orderItem) {
            throw new Error("Failed to create order item");
          }

          if (modifiers.length > 0) {
            await tx.insert(orderItemModifiers).values(
              modifiers.map((modifier) => ({
                ...modifier,
                orderItemId: orderItem.id,
              })),
            );
          }
        }

        if (taxes.length > 0) {
          await tx
            .insert(orderTaxes)
            .values(taxes.map((tax) => ({ ...tax, orderId: created.id })));
        }

        return created;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_CREATE_ORDER_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async updateOrder(
    input: UpdateOrderRepoInput,
  ): Promise<UpdateOrderRepoResult> {
    try {
      const [updated] = await this.database.client
        .update(orders)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(orders.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update order");
      }

      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_UPDATE_ORDER_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  // ========================================
  // ? ORDER PAYMENT SCHEMA METHODS
  // ========================================
  async findLatestPayment(
    input: FindLatestOrderPaymentRepoInput,
  ): Promise<FindLatestOrderPaymentRepoResult> {
    try {
      const [payment] = await this.database.client
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, input.orderId))
        .orderBy(desc(orderPayments.createdAt))
        .limit(1);

      return (await payment) ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_FIND_LATEST_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async createPayment(
    input: CreateOrderPaymentRepoInput,
  ): Promise<CreateOrderPaymentRepoResult> {
    try {
      const [payment] = await this.database.client
        .insert(orderPayments)
        .values(input)
        .returning();

      if (!payment) {
        throw new Error("Failed to create order payment");
      }

      return await payment;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_CREATE_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async updatePayment(
    input: UpdateOrderPaymentRepoInput,
  ): Promise<UpdateOrderPaymentRepoResult> {
    try {
      const [updated] = await this.database.client
        .update(orderPayments)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(orderPayments.id, input.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update order payment");
      }

      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_UPDATE_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findOnePayment(
    input: FindOneOrderPaymentRepoInput,
  ): Promise<FindOneOrderPaymentRepoResult> {
    try {
      const [payment] = await this.database.client
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.id, input.id))
        .limit(1);

      return payment ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_FIND_ONE_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async completePendingPayment(
    input: CompletePendingPaymentRepoInput,
  ): Promise<CompletePendingPaymentRepoResult> {
    try {
      return await this.database.client.transaction(async (tx) => {
        const [payment] = await tx
          .update(orderPayments)
          .set({
            paymentStatus: OrderPaymentStatusEnum.COMPLETED,
            providerStatus: input.providerStatus,
            responsePayload: input.responsePayload,
            completedAt: input.completedAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orderPayments.id, input.paymentId),
              eq(orderPayments.paymentStatus, OrderPaymentStatusEnum.PENDING),
            ),
          )
          .returning();

        if (!payment) return { payment: null, order: null };

        const [order] = await tx
          .update(orders)
          .set({
            paymentStatus: OrderPaymentStatusEnum.COMPLETED,
            orderStatus: OrderStatusEnum.PLACED,
            paymentMethod: payment.paymentMethod,
            placedAt: input.completedAt,
            expiresAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orders.id, payment.orderId),
              eq(orders.orderStatus, OrderStatusEnum.PENDING_PAYMENT),
            ),
          )
          .returning();

        if (order) {
          await tx.insert(orderStatusLogs).values({
            orderId: order.id,
            fromStatus: OrderStatusEnum.PENDING_PAYMENT,
            toStatus: OrderStatusEnum.PLACED,
            note: "Payment completed",
          });
        }

        return { payment, order: order ?? null };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_COMPLETE_PENDING_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async failPendingPayment(
    input: FailPendingPaymentRepoInput,
  ): Promise<FailPendingPaymentRepoResult> {
    try {
      const [payment] = await this.database.client
        .update(orderPayments)
        .set({
          paymentStatus: OrderPaymentStatusEnum.FAILED,
          providerStatus: input.providerStatus,
          failureReason: input.failureReason,
          responsePayload: input.responsePayload,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orderPayments.id, input.paymentId),
            eq(orderPayments.paymentStatus, OrderPaymentStatusEnum.PENDING),
          ),
        )
        .returning();

      return payment ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_FAIL_PENDING_PAYMENT_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  // ========================================
  // ? ORDER LISTING METHODS
  // ========================================
  async findOrders(input: FindOrdersRepoInput): Promise<FindOrdersRepoResult> {
    try {
      const conditions: (SQL | undefined)[] = [
        eq(orders.organizationId, input.organizationId),
      ];

      if (input.branchId) {
        conditions.push(eq(orders.branchId, input.branchId));
      }
      if (input.orderStatus !== undefined) {
        conditions.push(eq(orders.orderStatus, input.orderStatus));
      } else {
        conditions.push(
          ne(orders.orderStatus, OrderStatusEnum.PENDING_PAYMENT),
        );
      }
      if (input.paymentStatus !== undefined) {
        conditions.push(eq(orders.paymentStatus, input.paymentStatus));
      }
      if (input.paymentMethod !== undefined) {
        conditions.push(eq(orders.paymentMethod, input.paymentMethod));
      }
      if (input.orderType !== undefined) {
        conditions.push(eq(orders.orderType, input.orderType));
      }
      if (input.createdFrom) {
        conditions.push(gte(orders.createdAt, input.createdFrom));
      }
      if (input.createdTo) {
        conditions.push(lte(orders.createdAt, input.createdTo));
      }
      if (input.search) {
        const tokenMatch = /^#?(\d+)$/.exec(input.search);
        conditions.push(
          or(
            ilike(orders.orderNumber, `%${input.search}%`),
            tokenMatch
              ? eq(orders.tokenNumber, Number(tokenMatch[1]))
              : undefined,
          ),
        );
      }

      const condition = and(...conditions);
      const orderFn = input.sortOrder === SortingOrderEnum.ASC ? asc : desc;
      const sortColumn =
        input.sortBy === "orderNumber"
          ? orders.orderNumber
          : input.sortBy === "totalAmount"
            ? orders.totalAmount
            : orders.createdAt;

      const [rows, [totalRow]] = await Promise.all([
        this.database.client
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            tokenNumber: orders.tokenNumber,
            branchId: orders.branchId,
            branchName: branches.name,
            branchTimezone: branchSettings.timezone,
            orderType: orders.orderType,
            orderSource: orders.orderSource,
            orderStatus: orders.orderStatus,
            paymentStatus: orders.paymentStatus,
            paymentMethod: orders.paymentMethod,
            currencyCode: orders.currencyCode,
            totalAmount: orders.totalAmount,
            itemCount: sql<number>`(
              select coalesce(sum(${orderItems.quantity}), 0)::int
              from ${orderItems}
              where ${orderItems.orderId} = ${orders.id}
            )`,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .innerJoin(branches, eq(branches.id, orders.branchId))
          .leftJoin(
            branchSettings,
            eq(branchSettings.branchId, orders.branchId),
          )
          .where(condition)
          .orderBy(orderFn(sortColumn), desc(orders.id))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        this.database.client
          .select({ count: count() })
          .from(orders)
          .where(condition),
      ]);

      return { orders: rows, total: Number(totalRow?.count ?? 0) };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[ORDER_FIND_ORDERS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async countBusinessDayOrdersByStatus(
    input: CountBusinessDayOrdersByStatusRepoInput,
  ): Promise<CountBusinessDayOrdersByStatusRepoResult> {
    try {
      const rows = await this.database.client
        .select({ orderStatus: orders.orderStatus, count: count() })
        .from(orders)
        .where(
          and(
            eq(orders.businessDayId, input.businessDayId),
            inArray(orders.orderStatus, input.orderStatuses),
            input.orderType !== undefined
              ? eq(orders.orderType, input.orderType)
              : undefined,
          ),
        )
        .groupBy(orders.orderStatus);

      return rows.map((row) => ({
        orderStatus: row.orderStatus,
        count: Number(row.count),
      }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        "[ORDER_COUNT_BUSINESS_DAY_ORDERS_BY_STATUS_ERROR] " + error,
      );
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
