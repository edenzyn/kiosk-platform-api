import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { deviceAdminMiddleware } from "../../../middleware/device-admin.middleware";
import type { DeviceController } from "../device.controller";

const deviceRouter = Router();
const deviceController =
  container.resolve<DeviceController>("deviceController");

deviceRouter.get("/e", deviceController.deviceAuthCheck);

deviceRouter.post(
  "/admin/login",
  asyncHandler(deviceController.deviceAdminLogin),
);

deviceRouter.patch(
  "/admin/terminal",
  deviceAdminMiddleware,
  asyncHandler(deviceController.mapOwnTerminal),
);

export { deviceRouter };
