import type { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import type { OrderPaymentStatusEnum } from "../../../shared/enums/order/order-payment-status.enum";
import type { OrderSourceEnum } from "../../../shared/enums/order/order-source.enum";
import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface OrderDetailsUserDto {
  id: string;
  name: string;
}

export interface OrderDetailsItemModifierDto {
  id: string;
  modifierName: string;
  optionName: string;
  optionPrice: string;
}

export interface OrderDetailsItemDto {
  id: string;
  itemName: string;
  itemCode: string | null;
  categoryName: string | null;
  quantity: number;
  unitPrice: string;
  modifiersUnitAmount: string;
  takeawayChargeAmount: string;
  lineTotal: string;
  notes: string | null;
  modifiers: OrderDetailsItemModifierDto[];
}

export interface OrderDetailsTaxDto {
  id: string;
  taxName: string;
  taxRate: string;
  taxAmount: string;
}

export interface OrderDetailsPaymentDto {
  id: string;
  paymentMethod: TenantPaymentMethodEnum;
  paymentStatus: OrderPaymentStatusEnum;
  amount: string;
  providerSlug: string | null;
  providerTransactionId: string | null;
  failureReason: string | null;
  initiatedAt: Date;
  completedAt: Date | null;
  /** Staff member who took the payment on a counter. */
  collectedBy: OrderDetailsUserDto | null;
}

export interface OrderDetailsDto {
  id: string;
  orderNumber: string;
  /** Zero-padded to at least 3 digits, e.g. "007". Null until the order is paid. */
  tokenNumber: string | null;
  branchId: string;
  branchName: string;
  /** Null when the branch has no settings row yet. */
  branchTimezone: string | null;
  /** YYYY-MM-DD: the business day the order belongs to. */
  businessDate: string;
  deviceName: string | null;
  orderType: OrderTypeEnum;
  orderSource: OrderSourceEnum;
  orderStatus: OrderStatusEnum;
  paymentStatus: OrderPaymentStatusEnum;
  paymentMethod: TenantPaymentMethodEnum | null;
  isPayAtCounter: boolean;
  currencyCode: string;
  subtotalAmount: string;
  takeawayChargeAmount: string;
  discountAmount: string;
  amountBeforeTax: string;
  taxAmount: string;
  isTaxInclusive: boolean;
  totalAmount: string;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  placedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  /** Staff member who placed the order on a counter; null for a kiosk order. */
  createdBy: OrderDetailsUserDto | null;
  items: OrderDetailsItemDto[];
  taxes: OrderDetailsTaxDto[];
  payments: OrderDetailsPaymentDto[];
}

export interface GetOrderDetailsResponseDto {
  order: OrderDetailsDto;
}
