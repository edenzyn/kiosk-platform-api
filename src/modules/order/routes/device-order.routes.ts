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

deviceOrderRouter.get(
  "/pending-payments",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(orderController.getPendingPaymentOrders),
);

deviceOrderRouter.post(
  "/:id/payments",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(orderController.collectPendingPayment),
);

deviceOrderRouter.post(
  "/:id/cancel",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(orderController.cancelDeviceOrder),
);

export { deviceOrderRouter };
