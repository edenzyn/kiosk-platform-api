import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";

export interface ChangeKdsOrderStatusBodyDto {
  orderStatus: OrderStatusEnum;
}

export interface ChangeKdsOrderStatusResponseDto {
  order: {
    id: string;
    orderStatus: OrderStatusEnum;
  };
}
