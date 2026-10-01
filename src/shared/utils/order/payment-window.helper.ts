export interface PaymentWindow {
  /** Seconds left at response time, so clients never compare clocks. */
  expiresInSeconds: number;
  /** Full lifetime of the payment attempt, for progress indicators. */
  validForSeconds: number;
}

export const getPaymentWindow = (
  initiatedAt: Date,
  expiresAt: Date | null,
  now: Date = new Date(),
): PaymentWindow => {
  if (!expiresAt) return { expiresInSeconds: 0, validForSeconds: 0 };

  return {
    expiresInSeconds: Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    ),
    validForSeconds: Math.max(
      0,
      Math.round((expiresAt.getTime() - initiatedAt.getTime()) / 1000),
    ),
  };
};
