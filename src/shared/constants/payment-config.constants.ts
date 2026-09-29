import { PaymentProviderSlugEnum } from "../enums/finance/payment-provider-slug.enum";

export const PAYMENT_CONFIG_SECRET_KEYS: Record<string, string[]> = {
  [PaymentProviderSlugEnum.PHONEPE]: ["clientSecret"],
  [PaymentProviderSlugEnum.PINE_LABS]: ["securityToken"],
};
