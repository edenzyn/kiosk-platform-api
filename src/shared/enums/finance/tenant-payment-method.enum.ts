export enum TenantPaymentMethodEnum {
  QR = 1,
  CARD = 2,
  CASH = 3,
}

export const PROVIDERLESS_PAYMENT_METHODS: TenantPaymentMethodEnum[] = [
  TenantPaymentMethodEnum.CASH,
];
