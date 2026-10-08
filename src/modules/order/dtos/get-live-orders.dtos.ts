import type { OrderSourceEnum } from "../../../shared/enums/order/order-source.enum";
import type { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface LiveOrderItemModifierDto {
  id: string;
  modifierName: string;
  optionName: string;
}

export interface LiveOrderItemDto {
  id: string;
  itemName: string;
  quantity: number;
  modifiers: LiveOrderItemModifierDto[];
}

export interface LiveOrderDto {
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
  items: LiveOrderItemDto[];
}

export interface GetLiveOrdersResponseDto {
  orders: LiveOrderDto[];
  /** Every completed order of the business day; `orders` only carries the latest ones. */
  completedCount: number;
}
