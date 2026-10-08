import { OrderStatusEnum } from "../enums/order/order-status.enum";

/** The order a ticket moves through on the KDS, one step at a time. */
export const KDS_STATUS_FLOW = [
  OrderStatusEnum.PLACED,
  OrderStatusEnum.PREPARING,
  OrderStatusEnum.READY,
  OrderStatusEnum.COMPLETED,
];

/** Statuses the kitchen is still working on. */
export const KDS_ACTIVE_STATUSES = [
  OrderStatusEnum.PLACED,
  OrderStatusEnum.PREPARING,
  OrderStatusEnum.READY,
];

/** How many of the latest completed orders the KDS board gets. */
export const KDS_COMPLETED_ORDERS_LIMIT = 30;
