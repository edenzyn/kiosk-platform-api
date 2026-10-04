export enum SocketEventEnum {
  // ========================================
  // ? DEVICES
  // ========================================
  DEVICE_SESSION_REVOKED = "device.session.revoked",
  DEVICE_DEACTIVATED = "device.deactivated",

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
  BUSINESS_DAY_ORDERS_PAUSED = "business-day.orders-paused",
  BUSINESS_DAY_ORDERS_RESUMED = "business-day.orders-resumed",
}
