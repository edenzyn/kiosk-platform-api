import { validate as isUuid } from "uuid";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import { TaxComponentConditionTypeEnum } from "../../shared/enums/finance/tax-component-condition-type.enum";
import { TenantPaymentMethodEnum } from "../../shared/enums/finance/tenant-payment-method.enum";
import { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import { OrderSourceEnum } from "../../shared/enums/order/order-source.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { OrderTypeEnum } from "../../shared/enums/order/order-type.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import { AppError } from "../../shared/errors/app-error";
import {
  PHONEPE_ORDER_STATES,
  PHONEPE_WEBHOOK_EVENTS,
} from "../../shared/providers/finance/phonepe/phonepe.constants";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import { formatDateInTimezone } from "../../shared/utils/core/date.helper";
import { logger } from "../../shared/utils/core/logger";
import { toMinorUnits } from "../../shared/utils/finance/currency.helper";
import { resolveBusinessDayStart } from "../../shared/utils/order/business-day.helper";
import { calculateOrderPricing } from "../../shared/utils/order/calculate-order-pricing.helper";
import { formatTokenNumber } from "../../shared/utils/order/order-number.helper";
import { getPaymentWindow } from "../../shared/utils/order/payment-window.helper";
import type { BranchRepository } from "../branch/branch.repository";
import type { TaxRepository } from "../finance/repositories/tax.repository";
import type { PaymentService } from "../finance/services/payment.service";
import type { MarketRepository } from "../market/market.repository";
import type { MenuRepository } from "../menu/menu.repository";
import type { OrderRepository } from "./order.repository";
import type {
  CreateDeviceOrderServiceInput,
  CreateDeviceOrderServiceResult,
  HandlePhonePeWebhookServiceInput,
} from "./order.types";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly menuRepository: MenuRepository,
    private readonly marketRepository: MarketRepository,
    private readonly branchRepository: BranchRepository,
    private readonly taxRepository: TaxRepository,
    private readonly paymentService: PaymentService,
    private readonly realtimeProvider: RealtimeProvider,
  ) {}

  // ========================================
  // ? DEVICE ORDERS
  // ========================================
  async createDeviceOrder(
    input: CreateDeviceOrderServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    const { device, dto } = input;
    const { organizationId, branchId } = device;

    if (dto.paymentMethod !== TenantPaymentMethodEnum.QR) {
      throw new AppError("Only QR payments are available right now", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    let order = await this.orderRepository.findOneByIdempotencyKey({
      deviceId: device.id,
      idempotencyKey: dto.idempotencyKey,
    });

    if (order) {
      if (order.orderStatus !== OrderStatusEnum.PENDING_PAYMENT) {
        throw new AppError("This order has already been processed", {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
        });
      }

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
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            tokenNumber: formatTokenNumber(order.tokenNumber),
            orderStatus: order.orderStatus,
            currencyCode: order.currencyCode,
            totalAmount: order.totalAmount,
          },
          payment: {
            id: latestPayment.id,
            paymentMethod: latestPayment.paymentMethod,
            paymentStatus: latestPayment.paymentStatus,
            amount: latestPayment.amount,
            qrData: latestPayment.qrPayload,
            expiresAt: latestPayment.expiresAt,
            ...getPaymentWindow(
              latestPayment.initiatedAt,
              latestPayment.expiresAt,
            ),
          },
        };
      }
    } else {
      const [menuItems, market, settings, taxProfile] = await Promise.all([
        this.menuRepository.findOrderableItems({
          organizationId,
          branchId,
          itemIds: [...new Set(dto.items.map((item) => item.menuItemId))],
        }),
        this.marketRepository.findMarketByBranch({ branchId }),
        this.branchRepository.getOrCreateSettings(branchId),
        this.taxRepository.findTenantProfile({
          organizationId,
          branchId,
          conditionTypes: [
            TaxComponentConditionTypeEnum.ALWAYS,
            TaxComponentConditionTypeEnum.INTRA_STATE,
          ],
        }),
      ]);

      if (!market) {
        throw new AppError("This branch has no market", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        });
      }

      const isTakeaway = dto.orderType === OrderTypeEnum.TAKEAWAY;
      const lines = dto.items.map((dtoItem, index) => {
        const menuItem = menuItems.find(
          (item) => item.id === dtoItem.menuItemId,
        );
        if (!menuItem) {
          throw new AppError("Some items in the cart are no longer available", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
            code: ErrorCodes.BAD_REQUEST,
          });
        }

        const selectedOptions = [...new Set(dtoItem.optionIds)].map(
          (optionId) => {
            const modifier = menuItem.modifiers.find((group) =>
              group.options.some((option) => option.id === optionId),
            );
            const option = modifier?.options.find(
              (item) => item.id === optionId,
            );
            if (!modifier || !option) {
              throw new AppError(
                `Some options for ${menuItem.name} are no longer available`,
                {
                  statusCode: HttpStatusCodes.BAD_REQUEST,
                  code: ErrorCodes.BAD_REQUEST,
                },
              );
            }

            return { modifier, option };
          },
        );

        for (const modifier of menuItem.modifiers) {
          const selectedCount = selectedOptions.filter(
            (selected) => selected.modifier.id === modifier.id,
          ).length;
          if (
            selectedCount < modifier.minSelection ||
            selectedCount > modifier.maxSelection
          ) {
            throw new AppError(
              `Invalid choices for ${modifier.name} on ${menuItem.name}`,
              {
                statusCode: HttpStatusCodes.BAD_REQUEST,
                code: ErrorCodes.BAD_REQUEST,
              },
            );
          }
        }

        return {
          menuItem,
          selectedOptions,
          quantity: dtoItem.quantity,
          displayOrder: index,
          takeawayChargeUnitAmount:
            isTakeaway && menuItem.takeawayChargeEnabled
              ? (menuItem.takeawayChargeAmount ?? "0")
              : "0",
        };
      });

      const pricing = calculateOrderPricing(
        lines.map((line) => ({
          ...line,
          unitPrice: line.menuItem.price,
          optionPrices: line.selectedOptions.map(({ option }) => option.price),
        })),
        taxProfile?.components ?? [],
        taxProfile?.isTaxInclusive ?? false,
        market.currencyCode,
      );

      const now = new Date();
      const businessDayStartsAt = resolveBusinessDayStart(
        now,
        settings.timezone,
        settings.businessDayCutoffTime,
      );

      order = await this.orderRepository.createOrder({
        orderDateLabel: formatDateInTimezone(now, settings.timezone, "YYMMDD"),
        businessDayStartsAt,
        order: {
          organizationId,
          branchId,
          deviceId: device.id,
          idempotencyKey: dto.idempotencyKey,
          orderSource:
            device.type === DeviceTypeEnum.COUNTER
              ? OrderSourceEnum.COUNTER
              : OrderSourceEnum.KIOSK,
          orderType: dto.orderType,
          paymentMethod: dto.paymentMethod,
          currencyCode: market.currencyCode,
          subtotalAmount: pricing.subtotalAmount,
          takeawayChargeAmount: pricing.takeawayChargeAmount,
          amountBeforeTax: pricing.amountBeforeTax,
          taxAmount: pricing.taxAmount,
          isTaxInclusive: taxProfile?.isTaxInclusive ?? false,
          taxProfileId: taxProfile?.id ?? null,
          totalAmount: pricing.totalAmount,
        },
        items: pricing.lines.map((line) => ({
          menuItemId: line.menuItem.id,
          menuCategoryId: line.menuItem.categoryId,
          itemName: line.menuItem.name,
          itemCode: line.menuItem.code,
          categoryName: line.menuItem.categoryName,
          image: line.menuItem.image,
          quantity: line.quantity,
          unitPrice: line.menuItem.price,
          displayOrder: line.displayOrder,
          modifiersUnitAmount: line.modifiersUnitAmount,
          takeawayChargeUnitAmount: line.takeawayChargeUnitAmount,
          lineSubtotal: line.lineSubtotal,
          takeawayChargeAmount: line.takeawayChargeAmount,
          lineTotal: line.lineTotal,
          modifiers: line.selectedOptions.map(({ modifier, option }) => ({
            itemModifierId: modifier.id,
            itemModifierOptionId: option.id,
            modifierName: modifier.name,
            optionName: option.name,
            optionPrice: option.price,
          })),
        })),
        taxes: pricing.taxes,
      });
    }

    const pendingPayment = await this.orderRepository.createPayment({
      orderId: order.id,
      organizationId,
      branchId,
      deviceId: device.id,
      paymentMethod: TenantPaymentMethodEnum.QR,
      amount: order.totalAmount,
      currencyCode: order.currencyCode,
    });

    try {
      const qrPayment = await this.paymentService.createQrPayment({
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
        this.orderRepository.updateOrder({
          id: order.id,
          data: { expiresAt: qrPayment.expiresAt },
        }),
      ]);

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          tokenNumber: formatTokenNumber(order.tokenNumber),
          orderStatus: order.orderStatus,
          currencyCode: order.currencyCode,
          totalAmount: order.totalAmount,
        },
        payment: {
          id: payment.id,
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus,
          amount: payment.amount,
          qrData: payment.qrPayload,
          expiresAt: payment.expiresAt,
          ...getPaymentWindow(payment.initiatedAt, payment.expiresAt),
        },
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
        paymentStatus: OrderPaymentStatusEnum.PROCESSING,
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
