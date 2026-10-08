import type { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";

export interface CollectPendingPaymentBodyDto {
  paymentMethod: TenantPaymentMethodEnum;
}
