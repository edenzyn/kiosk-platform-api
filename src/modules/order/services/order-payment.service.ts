import { validate as isUuid } from "uuid";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import { OrderPaymentStatusEnum } from "../../../shared/enums/order/order-payment-status.enum";
import { SocketEventEnum } from "../../../shared/enums/socket/socket-event.enum";
import { BadRequestError } from "../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../shared/errors/conflict-error";
import { NotImplementedError } from "../../../shared/errors/not-implemented-error";
import {
  PHONEPE_ORDER_STATES,
  PHONEPE_WEBHOOK_EVENTS,
} from "../../../shared/providers/finance/phonepe/phonepe.constants";
import type { RealtimeProvider } from "../../../shared/providers/realtime/realtime.provider";
import { logger } from "../../../shared/utils/core/logger";
import { toMinorUnits } from "../../../shared/utils/finance/currency.helper";
import { formatTokenNumber } from "../../../shared/utils/order/order-number.helper";
import type { PaymentProviderService } from "../../finance/services/payment-provider.service";
import { OrderMapper } from "../order.mapper";
import type { OrderRepository } from "../order.repository";
import type {
  AssertPaymentMethodAvailableServiceInput,
  CreateDeviceOrderServiceResult,
  HandlePhonePeWebhookServiceInput,
  ProcessOrderPaymentServiceInput,
} from "../order.types";
import type { OrderEntity } from "../schemas/order.schema";

export class OrderPaymentService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly realtimeProvider: RealtimeProvider,
  ) {}

  // ========================================
  // ? PAYMENT PROCESSING
  // ========================================
  async assertPaymentMethodAvailable(
    input: AssertPaymentMethodAvailableServiceInput,
  ): Promise<void> {
    const { device, paymentMethod } = input;

    if (paymentMethod === undefined) {
      throw new BadRequestError("Payment method is required");
    }

    if (
      paymentMethod === TenantPaymentMethodEnum.CASH &&
      device.type !== DeviceTypeEnum.COUNTER
    ) {
      throw new BadRequestError("Cash can only be taken at a counter");
    }

    const methods = await this.paymentProviderService.getDevicePaymentMethods({
      device,
    });
    const isMethodEnabled = {
      [TenantPaymentMethodEnum.QR]: methods.isQrPaymentEnabled,
      [TenantPaymentMethodEnum.CARD]: methods.isCardPaymentEnabled,
      [TenantPaymentMethodEnum.CASH]: methods.isCashPaymentEnabled,
    }[paymentMethod];

    if (!isMethodEnabled) {
      throw new BadRequestError(
        "This payment method is not enabled at this branch",
      );
    }

    // TODO: Implement card payments in the future
    if (paymentMethod === TenantPaymentMethodEnum.CARD) {
      throw new NotImplementedError("Card payments are not implemented yet");
    }
  }

  async processPayment(
    input: ProcessOrderPaymentServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    switch (input.paymentMethod) {
      case TenantPaymentMethodEnum.CASH:
        return this._processCashPayment(input);
      case TenantPaymentMethodEnum.QR:
        return this._processQrPayment(input);
      case TenantPaymentMethodEnum.CARD:
        return this._processCardPayment();
      default:
        throw new BadRequestError("Payment method is required");
    }
  }

  private async _processCashPayment(
    input: ProcessOrderPaymentServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    const { device, staff, order } = input;

    const cashPayment = await this.orderRepository.createPayment({
      orderId: order.id,
      organizationId: order.organizationId,
      branchId: order.branchId,
      deviceId: device.id,
      paymentMethod: TenantPaymentMethodEnum.CASH,
      amount: order.totalAmount,
      currencyCode: order.currencyCode,
      collectedBy: staff?.userId ?? null,
    });

    const { order: placedOrder } =
      await this.orderRepository.completePendingPayment({
        paymentId: cashPayment.id,
        completedAt: new Date(),
      });

    if (!placedOrder) {
      await this.orderRepository.updatePayment({
        id: cashPayment.id,
        data: {
          paymentStatus: OrderPaymentStatusEnum.CANCELLED,
          failureReason: "Order was already settled",
        },
      });
      throw new ConflictError("This order has already been processed");
    }

    if (placedOrder.isPayAtCounter) {
      this.emitPendingPaymentsChanged(placedOrder);
    }

    return {
      order: OrderMapper.toDeviceOrderSummary(placedOrder),
      payment: null,
    };
  }

  private async _processQrPayment(
    input: ProcessOrderPaymentServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    const { device, staff, order } = input;
    const { organizationId, branchId } = order;

    const latestPayment = await this.orderRepository.findLatestPayment({
      orderId: order.id,
    });
    if (
      latestPayment &&
      latestPayment.paymentStatus === OrderPaymentStatusEnum.PENDING &&
      latestPayment.qrPayload &&
      latestPayment.expiresAt &&
      latestPayment.expiresAt > new Date()
    ) {
      return {
        order: OrderMapper.toDeviceOrderSummary(order),
        payment: OrderMapper.toDeviceOrderPayment(latestPayment),
      };
    }

    const pendingPayment = await this.orderRepository.createPayment({
      orderId: order.id,
      organizationId,
      branchId,
      deviceId: device.id,
      paymentMethod: TenantPaymentMethodEnum.QR,
      amount: order.totalAmount,
      currencyCode: order.currencyCode,
      collectedBy: staff?.userId ?? null,
    });

    try {
      const qrPayment = await this.paymentProviderService.createQrPayment({
        organizationId,
        branchId,
        merchantOrderId: pendingPayment.id,
        amount: order.totalAmount,
        currencyCode: order.currencyCode,
      });

      const [payment] = await Promise.all([
        this.orderRepository.updatePayment({
          id: pendingPayment.id,
          data: {
            paymentProviderId: qrPayment.paymentProviderId,
            providerSlug: qrPayment.providerSlug,
            providerTransactionId: qrPayment.providerOrderId,
            providerStatus: qrPayment.providerStatus,
            qrPayload: qrPayment.qrData,
            requestPayload: qrPayment.requestPayload,
            responsePayload: qrPayment.responsePayload,
            expiresAt: qrPayment.expiresAt,
          },
        }),
        order.isPayAtCounter
          ? order
          : this.orderRepository.updateOrder({
              id: order.id,
              data: { expiresAt: qrPayment.expiresAt },
            }),
      ]);

      return {
        order: OrderMapper.toDeviceOrderSummary(order),
        payment: OrderMapper.toDeviceOrderPayment(payment),
      };
    } catch (error) {
      await this.orderRepository.updatePayment({
        id: pendingPayment.id,
        data: {
          paymentStatus: OrderPaymentStatusEnum.FAILED,
          failureReason:
            error instanceof Error ? error.message : "QR payment failed",
        },
      });
      throw error;
    }
  }

  private async _processCardPayment(): Promise<CreateDeviceOrderServiceResult> {
    throw new NotImplementedError("Card payments are not implemented yet");
  }

  emitPendingPaymentsChanged(order: OrderEntity): void {
    this.realtimeProvider.emitToBranch(
      order.branchId,
      SocketEventEnum.ORDER_PENDING_PAYMENTS_CHANGED,
      { orderId: order.id },
      DeviceTypeEnum.COUNTER,
    );
  }

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handlePhonePeWebhook(
    input: HandlePhonePeWebhookServiceInput,
  ): Promise<void> {
    const { event, payload } = input.body;
    logger.log(
      `[OrderService] PhonePe webhook received: ${event} for ${payload?.merchantOrderId}`,
    );

    // merchantOrderId is our order_payments.id
    if (!payload?.merchantOrderId || !isUuid(payload.merchantOrderId)) return;

    const payment = await this.orderRepository.findOnePayment({
      id: payload.merchantOrderId,
    });
    if (!payment) {
      logger.warn(
        `[OrderService] PhonePe webhook for unknown payment ${payload.merchantOrderId}`,
      );
      return;
    }

    if (payment.paymentStatus !== OrderPaymentStatusEnum.PENDING) return;

    const paymentEvent = { orderId: payment.orderId, paymentId: payment.id };

    this.realtimeProvider.emitToDevice(
      payment.deviceId,
      SocketEventEnum.ORDER_PAYMENT_PROCESSING,
      {
        ...paymentEvent,
        paymentStatus: OrderPaymentStatusEnum.PENDING,
      },
    );

    if (
      event === PHONEPE_WEBHOOK_EVENTS.ORDER_COMPLETED &&
      payload.state === PHONEPE_ORDER_STATES.COMPLETED
    ) {
      if (
        payload.amount !== toMinorUnits(payment.amount, payment.currencyCode)
      ) {
        logger.error(
          `[OrderService] PhonePe amount mismatch for payment ${payment.id}: expected ${payment.amount} ${payment.currencyCode}, got ${payload.amount}`,
        );
        this.realtimeProvider.emitToDevice(
          payment.deviceId,
          SocketEventEnum.ORDER_PAYMENT_FAILED,
          {
            ...paymentEvent,
            paymentStatus: OrderPaymentStatusEnum.FAILED,
          },
        );
        return;
      }

      const { order } = await this.orderRepository.completePendingPayment({
        paymentId: payment.id,
        providerStatus: payload.state,
        responsePayload: input.body,
        completedAt: new Date(),
      });
      if (!order) {
        logger.warn(
          `[OrderService] Order ${payment.orderId} was already settled; payment ${payment.id} needs a refund`,
        );
        return;
      }

      this.realtimeProvider.emitToDevice(
        payment.deviceId,
        SocketEventEnum.ORDER_PAYMENT_COMPLETED,
        {
          ...paymentEvent,
          paymentStatus: OrderPaymentStatusEnum.COMPLETED,
          orderNumber: order.orderNumber,
          tokenNumber: formatTokenNumber(order.tokenNumber),
        },
      );

      if (order.isPayAtCounter) {
        this.emitPendingPaymentsChanged(order);
      }
      return;
    }

    if (event === PHONEPE_WEBHOOK_EVENTS.ORDER_FAILED) {
      await this.orderRepository.failPendingPayment({
        paymentId: payment.id,
        providerStatus: payload.state,
        failureReason:
          payload.paymentDetails?.[0]?.errorCode ?? "Payment failed",
        responsePayload: input.body,
      });
      this.realtimeProvider.emitToDevice(
        payment.deviceId,
        SocketEventEnum.ORDER_PAYMENT_FAILED,
        {
          ...paymentEvent,
          paymentStatus: OrderPaymentStatusEnum.FAILED,
        },
      );
    }
  }
}
