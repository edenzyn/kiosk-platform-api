import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { CollectPendingPaymentBodyDto } from "./dtos/collect-pending-payment.dtos";
import type { CreateDeviceOrderBodyDto } from "./dtos/create-device-order.dtos";
import type { GetLiveOrderCountsQueryDto } from "./dtos/get-live-order-counts.dtos";
import type { GetOrdersQueryDto } from "./dtos/get-orders.dtos";
import type { GetPendingPaymentOrdersQueryDto } from "./dtos/get-pending-payment-orders.dtos";
import type { OrderService } from "./services/order.service";
import { OrderValidator } from "./order.validator";

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ========================================
  // ? DEVICE ORDER APIS
  // ========================================
  createDeviceOrder = async (req: Request, res: Response): Promise<void> => {
    const dto = await OrderValidator.createDeviceOrder.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.orderService.createDeviceOrder({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff,
      dto: dto as CreateDeviceOrderBodyDto,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  getPendingPaymentOrders = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const queryDto = await OrderValidator.getPendingPaymentOrdersQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.orderService.getPendingPaymentOrders({
      device: req.device as DeviceTokenDto,
      filters: queryDto as GetPendingPaymentOrdersQueryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  collectPendingPayment = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { id } = await OrderValidator.orderIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const dto = await OrderValidator.collectPendingPayment.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.orderService.collectPendingPayment({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff,
      orderId: id,
      dto: dto as CollectPendingPaymentBodyDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  cancelDeviceOrder = async (req: Request, res: Response): Promise<void> => {
    const { id } = await OrderValidator.orderIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    await this.orderService.cancelDeviceOrder({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff,
      orderId: id,
    });
    res.status(HttpStatusCodes.OK).json({ message: "Order cancelled" });
  };

  // ========================================
  // ? USER ORDER APIS
  // ========================================
  getOrders = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await OrderValidator.getOrdersQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.orderService.getOrders({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto as GetOrdersQueryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getLiveOrderCounts = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await OrderValidator.getLiveOrderCountsQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.orderService.getLiveOrderCounts({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto as GetLiveOrderCountsQueryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
