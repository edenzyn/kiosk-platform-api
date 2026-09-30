import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { PhonePeWebhookPayload } from "../../shared/providers/finance/phonepe/phonepe.types";
import type {
  CreateDeviceOrderBodyDto,
  CreateDeviceOrderResponseDto,
} from "./dtos/create-device-order.dtos";
import type { CreateOrderItemModifierEntity } from "./schemas/order-item-modifier.schema";
import type { CreateOrderItemEntity } from "./schemas/order-item.schema";
import type {
  CreateOrderPaymentEntity,
  OrderPaymentEntity,
} from "./schemas/order-payment.schema";
import type { CreateOrderEntity, OrderEntity } from "./schemas/order.schema";
import type { CreateOrderTaxEntity } from "./schemas/order-tax.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface CreateDeviceOrderServiceInput {
  device: DeviceTokenDto;
  dto: CreateDeviceOrderBodyDto;
}
export type CreateDeviceOrderServiceResult = CreateDeviceOrderResponseDto;

export interface HandlePhonePeWebhookServiceInput {
  body: PhonePeWebhookPayload;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOrderByIdempotencyKeyRepoInput {
  deviceId: string;
  idempotencyKey: string;
}
export type FindOrderByIdempotencyKeyRepoResult = OrderEntity | null;

export interface FindLatestOrderPaymentRepoInput {
  orderId: string;
}
export type FindLatestOrderPaymentRepoResult = OrderPaymentEntity | null;

export interface CreateOrderItemRepoInput extends Omit<
  CreateOrderItemEntity,
  "orderId"
> {
  modifiers: Omit<CreateOrderItemModifierEntity, "orderItemId">[];
}

export interface CreateOrderRepoInput {
  order: Omit<CreateOrderEntity, "orderNumber" | "tokenNumber">;
  /** Calendar date of the order in the branch time zone (YYMMDD), e.g. "260930". */
  orderDateLabel: string;
  /** Tokens restart from 1 for orders created after this instant. */
  businessDayStartsAt: Date;
  items: CreateOrderItemRepoInput[];
  taxes: Omit<CreateOrderTaxEntity, "orderId">[];
}
export type CreateOrderRepoResult = OrderEntity;

export interface UpdateOrderRepoInput {
  id: string;
  data: Partial<Omit<CreateOrderEntity, "id">>;
}
export type UpdateOrderRepoResult = OrderEntity;

export type CreateOrderPaymentRepoInput = CreateOrderPaymentEntity;
export type CreateOrderPaymentRepoResult = OrderPaymentEntity;

export interface UpdateOrderPaymentRepoInput {
  id: string;
  data: Partial<Omit<CreateOrderPaymentEntity, "id">>;
}
export type UpdateOrderPaymentRepoResult = OrderPaymentEntity;

export interface FindOneOrderPaymentRepoInput {
  id: string;
}
export type FindOneOrderPaymentRepoResult = OrderPaymentEntity | null;

export interface CompletePendingPaymentRepoInput {
  paymentId: string;
  providerStatus: string;
  responsePayload: unknown;
  completedAt: Date;
}
export interface CompletePendingPaymentRepoResult {
  /** Null when the payment was no longer pending (already handled). */
  payment: OrderPaymentEntity | null;
  /** Null when the order was already settled by another payment attempt. */
  order: OrderEntity | null;
}

export interface FailPendingPaymentRepoInput {
  paymentId: string;
  providerStatus: string;
  failureReason: string;
  responsePayload: unknown;
}
export type FailPendingPaymentRepoResult = OrderPaymentEntity | null;
