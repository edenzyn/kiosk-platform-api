export const PHONEPE_SUPPORTED_CURRENCY_CODES = ["INR"];

export const PHONEPE_WEBHOOK_EVENTS = {
  ORDER_COMPLETED: "pg.order.completed",
  ORDER_FAILED: "pg.order.failed",
} as const;

export const PHONEPE_ORDER_STATES = {
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PENDING: "PENDING",
} as const;
