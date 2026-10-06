import type { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import type { OrderPaymentStatusEnum } from "../../../shared/enums/order/order-payment-status.enum";
import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface CreateDeviceOrderItemBodyDto {
  menuItemId: string;
  quantity: number;
  optionIds: string[];
}

export interface CreateDeviceOrderBodyDto {
  idempotencyKey: string;
  orderType: OrderTypeEnum;
  isPayAtCounter: boolean;
  paymentMethod?: TenantPaymentMethodEnum;
  items: CreateDeviceOrderItemBodyDto[];
}

export interface DeviceOrderSummaryDto {
  id: string;
  orderNumber: string;
  /**
   * Zero-padded to at least 3 digits, e.g. "007". A pay-at-counter or cash order
   * has it straight away; a QR order gets it once the payment completes.
   */
  tokenNumber: string | null;
  orderStatus: OrderStatusEnum;
  currencyCode: string;
  totalAmount: string;
}

export interface DeviceOrderPaymentDto {
  id: string;
  paymentMethod: TenantPaymentMethodEnum;
  paymentStatus: OrderPaymentStatusEnum;
  amount: string;
  qrData: string | null;
  expiresAt: Date | null;
  expiresInSeconds: number;
  validForSeconds: number;
}

export interface CreateDeviceOrderResponseDto {
  order: DeviceOrderSummaryDto;
  /** The QR payment to show; null for a pay-at-counter or cash order. */
  payment: DeviceOrderPaymentDto | null;
}
