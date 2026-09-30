import { and, desc, eq, gte, max, sql } from "drizzle-orm";
import type { Database } from "../../config/db";
import { buildOrderNumber } from "../../shared/utils/order/order-number.helper";
import type {
  CompletePendingPaymentRepoInput,
  CompletePendingPaymentRepoResult,
  CreateOrderPaymentRepoInput,
  CreateOrderPaymentRepoResult,
  CreateOrderRepoInput,
  CreateOrderRepoResult,
  FailPendingPaymentRepoInput,
  FailPendingPaymentRepoResult,
  FindLatestOrderPaymentRepoInput,
  FindLatestOrderPaymentRepoResult,
  FindOrderByIdempotencyKeyRepoInput,
  FindOneOrderPaymentRepoInput,
  FindOneOrderPaymentRepoResult,
  FindOrderByIdempotencyKeyRepoResult,
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
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { logger } from "../../shared/utils/core/logger";
import { PaymentStatusEnum } from "../../shared/enums/license/payment-status.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";

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
        // Serialises token numbering per branch for the rest of the transaction.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${order.branchId}))`,
        );

        const [latest] = await tx
          .select({ tokenNumber: max(orders.tokenNumber) })
          .from(orders)
          .where(
            and(
              eq(orders.branchId, order.branchId),
              gte(orders.createdAt, input.businessDayStartsAt),
            ),
          );
        const tokenNumber = (latest?.tokenNumber ?? 0) + 1;

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
            paymentStatus: PaymentStatusEnum.COMPLETED,
            providerStatus: input.providerStatus,
            responsePayload: input.responsePayload,
            completedAt: input.completedAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orderPayments.id, input.paymentId),
              eq(orderPayments.paymentStatus, PaymentStatusEnum.PENDING),
            ),
          )
          .returning();

        if (!payment) return { payment: null, order: null };

        const [order] = await tx
          .update(orders)
          .set({
            paymentStatus: PaymentStatusEnum.COMPLETED,
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
          paymentStatus: PaymentStatusEnum.FAILED,
          providerStatus: input.providerStatus,
          failureReason: input.failureReason,
          responsePayload: input.responsePayload,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orderPayments.id, input.paymentId),
            eq(orderPayments.paymentStatus, PaymentStatusEnum.PENDING),
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
}
