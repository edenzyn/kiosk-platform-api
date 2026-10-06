import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { TenantPaymentMethodEnum } from "../../shared/enums/finance/tenant-payment-method.enum";
import type { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import type { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../shared/enums/order/order-type.enum";
import type {
  GetLiveOrderCountsQueryDto,
  GetLiveOrderCountsResponseDto,
} from "./dtos/get-live-order-counts.dtos";
import type {
  GetOrdersQueryDto,
  GetOrdersResponseDto,
  OrderListItemDto,
} from "./dtos/get-orders.dtos";
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
  staff?: DeviceStaffTokenDto;
  dto: CreateDeviceOrderBodyDto;
}
export type CreateDeviceOrderServiceResult = CreateDeviceOrderResponseDto;

export interface HandlePhonePeWebhookServiceInput {
  body: PhonePeWebhookPayload;
}

export interface GetOrdersServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: GetOrdersQueryDto;
}
export type GetOrdersServiceResult = GetOrdersResponseDto;

export interface GetLiveOrderCountsServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: GetLiveOrderCountsQueryDto;
}
export type GetLiveOrderCountsServiceResult = GetLiveOrderCountsResponseDto;

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
  /** Pay-at-counter orders take their token now; the customer needs it to pay. */
  assignToken: boolean;
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
  providerStatus?: string;
  responsePayload?: unknown;
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

export interface FindOrdersRepoInput {
  organizationId: string;
  branchId?: string;
  page: number;
  limit: number;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
  /** When omitted, unpaid (PENDING_PAYMENT) orders are left out. */
  orderStatus?: OrderStatusEnum;
  paymentStatus?: OrderPaymentStatusEnum;
  paymentMethod?: TenantPaymentMethodEnum;
  orderType?: OrderTypeEnum;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export type OrderListRow = Omit<OrderListItemDto, "tokenNumber"> & {
  tokenNumber: number | null;
};
export interface FindOrdersRepoResult {
  orders: OrderListRow[];
  total: number;
}

export interface CancelUnpaidCounterOrdersRepoInput {
  businessDayId: string;
  reason: string;
}
/** How many orders were cancelled. */
export type CancelUnpaidCounterOrdersRepoResult = number;

export interface CountBusinessDayOrdersByStatusRepoInput {
  businessDayId: string;
  orderStatuses: OrderStatusEnum[];
  orderType?: OrderTypeEnum;
}
export type CountBusinessDayOrdersByStatusRepoResult = {
  orderStatus: OrderStatusEnum;
  count: number;
}[];
