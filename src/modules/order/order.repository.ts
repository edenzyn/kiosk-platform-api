import { and, desc, eq, gte, max, sql } from "drizzle-orm";
import type { Database } from "../../config/db";
import { buildOrderNumber } from "../../shared/utils/order/order-number.helper";
import type {
  CreateOrderPaymentRepoInput,
  CreateOrderPaymentRepoResult,
  CreateOrderRepoInput,
  CreateOrderRepoResult,
  FindLatestOrderPaymentRepoInput,
  FindLatestOrderPaymentRepoResult,
  FindOrderByIdempotencyKeyRepoInput,
  FindOrderByIdempotencyKeyRepoResult,
  UpdateOrderPaymentRepoInput,
  UpdateOrderPaymentRepoResult,
  UpdateOrderRepoInput,
  UpdateOrderRepoResult,
} from "./order.types";
import { orderItemModifiers } from "./schemas/order-item-modifier.schema";
import { orderItems } from "./schemas/order-item.schema";
import { orderPayments } from "./schemas/order-payment.schema";
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

    return order ?? null;
  }

  async createOrder(
    input: CreateOrderRepoInput,
  ): Promise<CreateOrderRepoResult> {
    const { order, items, taxes } = input;

    return this.database.client.transaction(async (tx) => {
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
  }

  async updateOrder(
    input: UpdateOrderRepoInput,
  ): Promise<UpdateOrderRepoResult> {
    const [updated] = await this.database.client
      .update(orders)
      .set({ ...input.data, updatedAt: new Date() })
      .where(eq(orders.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update order");
    }

    return updated;
  }

  // ========================================
  // ? ORDER PAYMENT SCHEMA METHODS
  // ========================================
  async findLatestPayment(
    input: FindLatestOrderPaymentRepoInput,
  ): Promise<FindLatestOrderPaymentRepoResult> {
    const [payment] = await this.database.client
      .select()
      .from(orderPayments)
      .where(eq(orderPayments.orderId, input.orderId))
      .orderBy(desc(orderPayments.createdAt))
      .limit(1);

    return payment ?? null;
  }

  async createPayment(
    input: CreateOrderPaymentRepoInput,
  ): Promise<CreateOrderPaymentRepoResult> {
    const [payment] = await this.database.client
      .insert(orderPayments)
      .values(input)
      .returning();

    if (!payment) {
      throw new Error("Failed to create order payment");
    }

    return payment;
  }

  async updatePayment(
    input: UpdateOrderPaymentRepoInput,
  ): Promise<UpdateOrderPaymentRepoResult> {
    const [updated] = await this.database.client
      .update(orderPayments)
      .set({ ...input.data, updatedAt: new Date() })
      .where(eq(orderPayments.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update order payment");
    }

    return updated;
  }
}
