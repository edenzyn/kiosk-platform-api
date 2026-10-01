import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { OrderController } from "../order.controller";

const deviceOrderRouter = Router();
const orderController = container.resolve<OrderController>("orderController");

deviceOrderRouter.post(
  "/",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  asyncHandler(orderController.createDeviceOrder),
);

export { deviceOrderRouter };
