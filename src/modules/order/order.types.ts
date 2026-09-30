import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
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
