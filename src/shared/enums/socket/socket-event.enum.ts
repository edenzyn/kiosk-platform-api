export enum SocketEventEnum {
  // ========================================
  // ? DEVICES
  // ========================================
  DEVICE_SESSION_REVOKED = "device.session.revoked",
  DEVICE_DEACTIVATED = "device.deactivated",
  DEVICE_STAFF_SESSION_REVOKED = "device.staff-session.revoked",

  // ========================================
  // ? ORDERS
  // ========================================
  ORDER_PAYMENT_PROCESSING = "order.payment.processing",
  ORDER_PAYMENT_COMPLETED = "order.payment.completed",
  ORDER_PAYMENT_FAILED = "order.payment.failed",
  ORDER_PENDING_PAYMENTS_CHANGED = "order.pending-payments.changed",
  ORDER_PLACED = "order.placed",
  ORDER_STATUS_CHANGED = "order.status.changed",

  // ========================================
  // ? BUSINESS DAYS
  // ========================================
  BUSINESS_DAY_OPENED = "business-day.opened",
  BUSINESS_DAY_CLOSED = "business-day.closed",
  BUSINESS_DAY_ORDERS_PAUSED = "business-day.orders-paused",
  BUSINESS_DAY_ORDERS_RESUMED = "business-day.orders-resumed",

  // ========================================
  // ? SHIFTS
  // ========================================
  SHIFT_FORCE_CLOSED = "shift.force-closed",
}
