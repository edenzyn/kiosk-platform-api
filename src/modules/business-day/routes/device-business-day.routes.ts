import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { BusinessDayController } from "../business-day.controller";

const deviceBusinessDayRouter = Router();
const businessDayController = container.resolve<BusinessDayController>(
  "businessDayController",
);

deviceBusinessDayRouter.get(
  "/current",
  accessMiddleware({
    deviceType: [
      DeviceTypeEnum.KIOSK,
      DeviceTypeEnum.COUNTER,
      DeviceTypeEnum.KDS,
      DeviceTypeEnum.CDS,
    ],
  }),
  asyncHandler(businessDayController.getDeviceBusinessDay),
);

export { deviceBusinessDayRouter };
