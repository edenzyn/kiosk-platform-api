import {
  KDS_ACTIVE_STATUSES,
  KDS_COMPLETED_ORDERS_LIMIT,
  KDS_STATUS_FLOW,
} from "../../../shared/constants/order.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import { TaxComponentConditionTypeEnum } from "../../../shared/enums/finance/tax-component-condition-type.enum";
import { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import { OrderPaymentStatusEnum } from "../../../shared/enums/order/order-payment-status.enum";
import { OrderSourceEnum } from "../../../shared/enums/order/order-source.enum";
import { OrderStatusEnum } from "../../../shared/enums/order/order-status.enum";
import { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";
import { SocketEventEnum } from "../../../shared/enums/socket/socket-event.enum";
import { BadRequestError } from "../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../shared/errors/not-found-error";
import type { RealtimeProvider } from "../../../shared/providers/realtime/realtime.provider";
import { formatDateInTimezone } from "../../../shared/utils/core/date.helper";
import { calculateOrderPricing } from "../../../shared/utils/order/calculate-order-pricing.helper";
import { formatTokenNumber } from "../../../shared/utils/order/order-number.helper";
import type { BranchRepository } from "../../branch/branch.repository";
import type { BusinessDayService } from "../../business-day/business-day.service";
import type { TaxRepository } from "../../finance/repositories/tax.repository";
import type { MarketRepository } from "../../market/market.repository";
import type { MenuRepository } from "../../menu/menu.repository";
import type { ShiftService } from "../../shift/shift.service";
import type { OrderPaymentService } from "./order-payment.service";
import { OrderMapper } from "../order.mapper";
import type { OrderRepository } from "../order.repository";
import type {
  CancelDeviceOrderServiceInput,
  ChangeKdsOrderStatusServiceInput,
  ChangeKdsOrderStatusServiceResult,
  CollectPendingPaymentServiceInput,
  CreateDeviceOrderServiceInput,
  CreateOrderFromCartServiceInput,
  CreateDeviceOrderServiceResult,
  GetKdsOrdersServiceInput,
  GetKdsOrdersServiceResult,
  GetPendingPaymentOrdersServiceInput,
  GetPendingPaymentOrdersServiceResult,
  GetLiveOrderCountsServiceInput,
  GetLiveOrderCountsServiceResult,
  GetOrdersServiceInput,
  GetOrdersServiceResult,
  GetOrderDetailsServiceInput,
  GetOrderDetailsServiceResult,
} from "../order.types";
import type { OrderEntity } from "../schemas/order.schema";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly menuRepository: MenuRepository,
    private readonly marketRepository: MarketRepository,
    private readonly branchRepository: BranchRepository,
    private readonly taxRepository: TaxRepository,
    private readonly businessDayService: BusinessDayService,
    private readonly orderPaymentService: OrderPaymentService,
    private readonly shiftService: ShiftService,
    private readonly realtimeProvider: RealtimeProvider,
  ) {}

  // ========================================
  // ? DEVICE ORDERS
  // ========================================
  async createDeviceOrder(
    input: CreateDeviceOrderServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    const { device, staff, dto } = input;
    const { isPayAtCounter, paymentMethod } = dto;

    const shiftId =
      device.type === DeviceTypeEnum.COUNTER
        ? await this.shiftService.getActiveShiftId({ device, staff })
        : null;

    let order = await this.orderRepository.findOneByIdempotencyKey({
      deviceId: device.id,
      idempotencyKey: dto.idempotencyKey,
    });

    if (order) {
      if (this._isAlreadyPaidInCash(order, paymentMethod)) {
        return {
          order: OrderMapper.toDeviceOrderSummary(order),
          payment: null,
        };
      }

      if (order.orderStatus !== OrderStatusEnum.PENDING_PAYMENT) {
        throw new ConflictError("This order has already been processed");
      }

      if (order.isPayAtCounter) {
        return {
          order: OrderMapper.toDeviceOrderSummary(order),
          payment: null,
        };
      }

      const openBusinessDayId =
        await this.businessDayService.getOpenBusinessDayId({
          branchId: device.branchId,
        });
      if (openBusinessDayId !== order.businessDayId) {
        throw new ConflictError("The branch is closed for orders right now", {
          code: ErrorCodes.BUSINESS_DAY_CLOSED,
        });
      }
    }

    if (!isPayAtCounter) {
      await this.orderPaymentService.assertPaymentMethodAvailable({
        device,
        paymentMethod,
      });
    }

    if (!order) {
      order = await this._createOrderFromCart({ device, staff, dto, shiftId });

      if (isPayAtCounter) {
        this.orderPaymentService.emitPendingPaymentsChanged(order);
        return {
          order: OrderMapper.toDeviceOrderSummary(order),
          payment: null,
        };
      }
    }

    return this.orderPaymentService.processPayment({
      device,
      staff,
      order,
      paymentMethod,
      shiftId,
    });
  }

  /** Prices the cart on the server and saves it as a new order in the open business day. */
  private async _createOrderFromCart(
    input: CreateOrderFromCartServiceInput,
  ): Promise<OrderEntity> {
    const { device, staff, dto, shiftId } = input;
    const { organizationId, branchId } = device;
    const { isPayAtCounter } = dto;

    const businessDayId = await this.businessDayService.getOpenBusinessDayId({
      branchId,
    });

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
      throw new BadRequestError("This branch has no market");
    }

    if (isPayAtCounter && !settings.isCashPaymentEnabled) {
      throw new BadRequestError(
        "Pay at counter is not available at this branch",
      );
    }

    const isTakeaway = dto.orderType === OrderTypeEnum.TAKEAWAY;

    const lines = dto.items.map((dtoItem, index) => {
      const menuItem = menuItems.find((item) => item.id === dtoItem.menuItemId);
      if (!menuItem) {
        throw new BadRequestError(
          "Some items in the cart are no longer available",
        );
      }

      const selectedOptions = [...new Set(dtoItem.optionIds)].map(
        (optionId) => {
          const modifier = menuItem.modifiers.find((group) =>
            group.options.some((option) => option.id === optionId),
          );
          const option = modifier?.options.find((item) => item.id === optionId);
          if (!modifier || !option) {
            throw new BadRequestError(
              `Some options for ${menuItem.name} are no longer available`,
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
          throw new BadRequestError(
            `Invalid choices for ${modifier.name} on ${menuItem.name}`,
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

    return this.orderRepository.createOrder({
      orderDateLabel: formatDateInTimezone(
        new Date(),
        settings.timezone,
        "YYMMDD",
      ),
      assignToken: isPayAtCounter,
      order: {
        organizationId,
        branchId,
        deviceId: device.id,
        shiftId,
        businessDayId,
        idempotencyKey: dto.idempotencyKey,
        orderSource:
          device.type === DeviceTypeEnum.COUNTER
            ? OrderSourceEnum.COUNTER
            : OrderSourceEnum.KIOSK,
        orderType: dto.orderType,
        isPayAtCounter,
        paymentMethod: isPayAtCounter ? null : dto.paymentMethod,
        currencyCode: market.currencyCode,
        subtotalAmount: pricing.subtotalAmount,
        takeawayChargeAmount: pricing.takeawayChargeAmount,
        amountBeforeTax: pricing.amountBeforeTax,
        taxAmount: pricing.taxAmount,
        isTaxInclusive: taxProfile?.isTaxInclusive ?? false,
        taxProfileId: taxProfile?.id ?? null,
        totalAmount: pricing.totalAmount,
        createdBy: staff?.userId ?? null,
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

  // ========================================
  // ? COUNTER PENDING PAYMENTS
  // ========================================
  async getPendingPaymentOrders(
    input: GetPendingPaymentOrdersServiceInput,
  ): Promise<GetPendingPaymentOrdersServiceResult> {
    const { device, filters } = input;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const businessDayId =
      await this.businessDayService.findCurrentBusinessDayId({
        branchId: device.branchId,
      });
    if (!businessDayId) {
      return { orders: [], total: 0, page, limit, totalPages: 0 };
    }

    const { orders, total } =
      await this.orderRepository.findPendingCounterOrders({
        businessDayId,
        search: filters.search,
        page,
        limit,
      });

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async collectPendingPayment(
    input: CollectPendingPaymentServiceInput,
  ): Promise<CreateDeviceOrderServiceResult> {
    const { device, staff, orderId, dto } = input;

    const shiftId = await this.shiftService.getActiveShiftId({ device, staff });

    const order = await this.orderRepository.findOne({
      id: orderId,
      branchId: device.branchId,
    });
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (this._isAlreadyPaidInCash(order, dto.paymentMethod)) {
      return { order: OrderMapper.toDeviceOrderSummary(order), payment: null };
    }

    if (!order.isPayAtCounter) {
      throw new ConflictError("This order is not paid at the counter");
    }

    if (order.orderStatus !== OrderStatusEnum.PENDING_PAYMENT) {
      throw new ConflictError("This order has already been processed");
    }

    await this.orderPaymentService.assertPaymentMethodAvailable({
      device,
      paymentMethod: dto.paymentMethod,
    });

    const collectedOrder = await this.orderRepository.updateOrder({
      id: order.id,
      data: { shiftId },
    });

    return this.orderPaymentService.processPayment({
      device,
      staff,
      order: collectedOrder,
      paymentMethod: dto.paymentMethod,
      shiftId,
    });
  }

  async cancelDeviceOrder(input: CancelDeviceOrderServiceInput): Promise<void> {
    const { device, staff, orderId } = input;

    const shiftId = await this.shiftService.getActiveShiftId({ device, staff });

    const cancelledOrder = await this.orderRepository.cancelUnpaidCounterOrder({
      id: orderId,
      branchId: device.branchId,
      reason: "Cancelled at the counter before payment",
      cancelledBy: staff?.userId ?? null,
      shiftId,
    });
    if (!cancelledOrder) {
      throw new ConflictError("This order can no longer be cancelled");
    }

    this.orderPaymentService.emitPendingPaymentsChanged(cancelledOrder);
  }

  // ========================================
  // ? KDS ORDERS
  // ========================================
  async getKdsOrders(
    input: GetKdsOrdersServiceInput,
  ): Promise<GetKdsOrdersServiceResult> {
    const businessDayId =
      await this.businessDayService.findCurrentBusinessDayId({
        branchId: input.device.branchId,
      });
    if (!businessDayId) {
      return { orders: [], completedCount: 0 };
    }

    const [orders, completedCounts] = await Promise.all([
      this.orderRepository.findKdsOrders({
        businessDayId,
        activeStatuses: KDS_ACTIVE_STATUSES,
        completedLimit: KDS_COMPLETED_ORDERS_LIMIT,
      }),
      this.orderRepository.countBusinessDayOrdersByStatus({
        businessDayId,
        orderStatuses: [OrderStatusEnum.COMPLETED],
      }),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        tokenNumber: formatTokenNumber(order.tokenNumber),
      })),
      completedCount: completedCounts[0]?.count ?? 0,
    };
  }

  async changeKdsOrderStatus(
    input: ChangeKdsOrderStatusServiceInput,
  ): Promise<ChangeKdsOrderStatusServiceResult> {
    const { device, orderId, dto } = input;

    const [order, businessDayId] = await Promise.all([
      this.orderRepository.findOne({ id: orderId, branchId: device.branchId }),
      this.businessDayService.findCurrentBusinessDayId({
        branchId: device.branchId,
      }),
    ]);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.businessDayId !== businessDayId) {
      throw new ConflictError("This order is from an earlier business day");
    }

    const fromIndex = KDS_STATUS_FLOW.indexOf(order.orderStatus);
    const toIndex = KDS_STATUS_FLOW.indexOf(dto.orderStatus);
    if (fromIndex === -1 || toIndex - fromIndex !== 1) {
      throw new ConflictError("This order has already been updated");
    }

    const changedAt = new Date();

    const updatedOrder = await this.orderRepository.changeOrderStatus({
      id: order.id,
      fromStatus: order.orderStatus,
      toStatus: dto.orderStatus,
      timestamps: {
        ...(dto.orderStatus === OrderStatusEnum.PREPARING && {
          preparingAt: changedAt,
        }),
        ...(dto.orderStatus === OrderStatusEnum.READY && {
          readyAt: changedAt,
        }),
        ...(dto.orderStatus === OrderStatusEnum.COMPLETED && {
          completedAt: changedAt,
        }),
      },
      changedByDeviceId: device.id,
    });
    if (!updatedOrder) {
      throw new ConflictError("This order has already been updated");
    }

    for (const deviceType of [DeviceTypeEnum.KDS, DeviceTypeEnum.CDS]) {
      this.realtimeProvider.emitToBranch(
        updatedOrder.branchId,
        SocketEventEnum.ORDER_STATUS_CHANGED,
        { orderId: updatedOrder.id, orderStatus: updatedOrder.orderStatus },
        deviceType,
      );
    }

    return {
      order: { id: updatedOrder.id, orderStatus: updatedOrder.orderStatus },
    };
  }

  // ========================================
  // ? ORDER STATE CHECKS
  // ========================================
  /** A repeated cash request for an order that cash already paid gets the same order back. */
  private _isAlreadyPaidInCash(
    order: OrderEntity,
    paymentMethod?: TenantPaymentMethodEnum,
  ): boolean {
    return (
      paymentMethod === TenantPaymentMethodEnum.CASH &&
      order.paymentMethod === TenantPaymentMethodEnum.CASH &&
      order.paymentStatus === OrderPaymentStatusEnum.COMPLETED
    );
  }

  // ========================================
  // ? USER ORDER LISTS
  // ========================================
  async getOrders(
    input: GetOrdersServiceInput,
  ): Promise<GetOrdersServiceResult> {
    const { effectiveTenant, filters } = input;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const { orders, total } = await this.orderRepository.findOrders({
      ...filters,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId || filters.branchId || undefined,
      page,
      limit,
    });

    return {
      orders: orders.map((order) => ({
        ...order,
        tokenNumber: formatTokenNumber(order.tokenNumber),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderDetails(
    input: GetOrderDetailsServiceInput,
  ): Promise<GetOrderDetailsServiceResult> {
    const { effectiveTenant, orderId } = input;

    const order = await this.orderRepository.findOrderDetails({
      id: orderId,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId || undefined,
    });
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return {
      order: { ...order, tokenNumber: formatTokenNumber(order.tokenNumber) },
    };
  }

  async getLiveOrderCounts(
    input: GetLiveOrderCountsServiceInput,
  ): Promise<GetLiveOrderCountsServiceResult> {
    const { effectiveTenant, filters } = input;
    const { branchId } = effectiveTenant;

    if (!branchId) {
      throw new BadRequestError(
        "A branch must be selected to view live orders",
      );
    }

    const businessDayId =
      await this.businessDayService.findCurrentBusinessDayId({ branchId });

    const statusCounts = businessDayId
      ? await this.orderRepository.countBusinessDayOrdersByStatus({
          businessDayId,
          orderStatuses: [
            OrderStatusEnum.PLACED,
            OrderStatusEnum.PREPARING,
            OrderStatusEnum.READY,
            OrderStatusEnum.COMPLETED,
          ],
          orderType: filters.orderType,
        })
      : [];
    const countByStatus = new Map(
      statusCounts.map(({ orderStatus, count }) => [orderStatus, count]),
    );

    return {
      placed: countByStatus.get(OrderStatusEnum.PLACED) ?? 0,
      preparing: countByStatus.get(OrderStatusEnum.PREPARING) ?? 0,
      ready: countByStatus.get(OrderStatusEnum.READY) ?? 0,
      completed: countByStatus.get(OrderStatusEnum.COMPLETED) ?? 0,
    };
  }
}
