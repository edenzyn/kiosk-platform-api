import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { CreateDeviceOrderBodyDto } from "./dtos/create-device-order.dtos";
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
      dto: dto as CreateDeviceOrderBodyDto,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };
}
