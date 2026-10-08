import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { PaymentProviderController } from "../controllers/payment-provider.controller";

const devicePaymentProviderRouter = Router();
const paymentProviderController = container.resolve<PaymentProviderController>(
  "paymentProviderController",
);

devicePaymentProviderRouter.get(
  "/methods",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  asyncHandler(paymentProviderController.getDevicePaymentMethods),
);

export { devicePaymentProviderRouter };
