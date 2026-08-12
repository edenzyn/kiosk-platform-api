import { Router } from "express";
import { container } from "../../../config/container";
import type { DeviceController } from "../device.controller";

const deviceRouter = Router();
const deviceController =
  container.resolve<DeviceController>("deviceController");

deviceRouter.get("/e", deviceController.deviceAuthCheck);

export { deviceRouter };
