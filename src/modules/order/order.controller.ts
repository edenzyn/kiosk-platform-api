import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { CreateDeviceOrderBodyDto } from "./dtos/create-device-order.dtos";
import type { GetLiveOrderCountsQueryDto } from "./dtos/get-live-order-counts.dtos";
import type { GetOrdersQueryDto } from "./dtos/get-orders.dtos";
import type { OrderService } from "./order.service";
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
