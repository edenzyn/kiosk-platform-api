import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import type { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import type { OrderDateFilterEnum } from "../../../shared/enums/order/order-date-filter.enum";
import type { OrderPaymentStatusEnum } from "../../../shared/enums/order/order-payment-status.enum";
import type { OrderSourceEnum } from "../../../shared/enums/order/order-source.enum";
import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface GetOrdersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  /** Which date the range applies to; the created time when omitted. */
  dateField?: OrderDateFilterEnum;
  /** YYYY-MM-DD for the business date, an ISO date-time for every other field. */
  dateFrom?: string;
  dateTo?: string;
  orderStatus?: OrderStatusEnum;
  paymentStatus?: OrderPaymentStatusEnum;
  paymentMethod?: TenantPaymentMethodEnum;
  orderType?: OrderTypeEnum;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}

export interface OrderListItemDto {
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
  orderType: OrderTypeEnum;
  orderSource: OrderSourceEnum;
  orderStatus: OrderStatusEnum;
  paymentStatus: OrderPaymentStatusEnum;
  paymentMethod: TenantPaymentMethodEnum | null;
  currencyCode: string;
  totalAmount: string;
  itemCount: number;
  createdAt: Date;
}

export interface GetOrdersResponseDto {
  orders: OrderListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
