export enum SocketEventEnum {
  // ========================================
  // ? ORDERS
  // ========================================
  ORDER_PAYMENT_PROCESSING = "order.payment.processing",
  ORDER_PAYMENT_COMPLETED = "order.payment.completed",
  ORDER_PAYMENT_FAILED = "order.payment.failed",

  // ========================================
  // ? BUSINESS DAYS
  // ========================================
  BUSINESS_DAY_OPENED = "business-day.opened",
  BUSINESS_DAY_CLOSED = "business-day.closed",
}
