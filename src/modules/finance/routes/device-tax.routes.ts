import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { TaxController } from "../controllers/tax.controller";

const deviceTaxRouter = Router();
const taxController = container.resolve<TaxController>("taxController");

deviceTaxRouter.get(
  "/profile",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  taxController.getDeviceTaxProfile,
);

export { deviceTaxRouter };
