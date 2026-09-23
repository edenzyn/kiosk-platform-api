import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { FinanceController } from "../finance.controller";

const deviceTaxRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

deviceTaxRouter.get(
  "/profile",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  financeController.getDeviceTaxProfile,
);

export { deviceTaxRouter };
