import type { OrderSourceEnum } from "../../../shared/enums/order/order-source.enum";
import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface KdsOrderItemModifierDto {
  id: string;
  modifierName: string;
  optionName: string;
}

export interface KdsOrderItemDto {
  id: string;
  itemName: string;
  quantity: number;
  modifiers: KdsOrderItemModifierDto[];
}

export interface KdsOrderDto {
  id: string;
  orderNumber: string;
  tokenNumber: string | null;
  orderType: OrderTypeEnum;
  orderSource: OrderSourceEnum;
  orderStatus: OrderStatusEnum;
  placedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  items: KdsOrderItemDto[];
}

export interface GetKdsOrdersResponseDto {
  orders: KdsOrderDto[];
  /** Every completed order of the business day; `orders` only carries the latest ones. */
  completedCount: number;
}
