import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface GetPendingPaymentOrdersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PendingPaymentOrderDto {
  id: string;
  orderNumber: string;
  tokenNumber: number | null;
  orderType: OrderTypeEnum;
  currencyCode: string;
  totalAmount: string;
  itemCount: number;
  createdAt: Date;
}

export interface GetPendingPaymentOrdersResponseDto {
  orders: PendingPaymentOrderDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
