import { formatTokenNumber } from "../../shared/utils/order/order-number.helper";
import { getPaymentWindow } from "../../shared/utils/order/payment-window.helper";
import type {
  DeviceOrderPaymentDto,
  DeviceOrderSummaryDto,
} from "./dtos/create-device-order.dtos";
import type { OrderPaymentEntity } from "./schemas/order-payment.schema";
import type { OrderEntity } from "./schemas/order.schema";

export class OrderMapper {
  static toDeviceOrderSummary(order: OrderEntity): DeviceOrderSummaryDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tokenNumber: formatTokenNumber(order.tokenNumber),
      orderStatus: order.orderStatus,
      currencyCode: order.currencyCode,
      totalAmount: order.totalAmount,
    };
  }

  static toDeviceOrderPayment(
    payment: OrderPaymentEntity,
  ): DeviceOrderPaymentDto {
    return {
      id: payment.id,
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      amount: payment.amount,
      qrData: payment.qrPayload,
      expiresAt: payment.expiresAt,
      ...getPaymentWindow(payment.initiatedAt, payment.expiresAt),
    };
  }
}
