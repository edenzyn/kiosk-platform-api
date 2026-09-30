import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { PaymentController } from "../controllers/payment.controller";

const devicePaymentRouter = Router();
const paymentController =
  container.resolve<PaymentController>("paymentController");

devicePaymentRouter.get(
  "/methods",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  asyncHandler(paymentController.getDevicePaymentMethods),
);

export { devicePaymentRouter };
