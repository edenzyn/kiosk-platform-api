import { PaymentProviderSlugEnum } from "../enums/finance/payment-provider-slug.enum";
import { TenantPaymentMethodEnum } from "../enums/finance/tenant-payment-method.enum";

export const PAYMENT_CONFIG_SECRET_KEYS: Record<string, string[]> = {
  [PaymentProviderSlugEnum.PHONEPE]: ["clientSecret"],
  [PaymentProviderSlugEnum.PINE_LABS]: ["securityToken"],
};

export const PAYMENT_CONNECTION_TEST_SUPPORT: Record<
  string,
  TenantPaymentMethodEnum[]
> = {
  [PaymentProviderSlugEnum.PHONEPE]: [TenantPaymentMethodEnum.QR],
};
