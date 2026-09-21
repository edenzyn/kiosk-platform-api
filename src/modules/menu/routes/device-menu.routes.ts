import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { MenuController } from "../menu.controller";

const deviceMenuRouter = Router();
const menuController = container.resolve<MenuController>("menuController");

deviceMenuRouter.get(
  "/categories",
  accessMiddleware({
    deviceType: [DeviceTypeEnum.KIOSK, DeviceTypeEnum.COUNTER],
  }),
  menuController.getDeviceCategories,
);

export { deviceMenuRouter };
