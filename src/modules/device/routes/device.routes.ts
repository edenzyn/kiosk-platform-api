import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { deviceAdminMiddleware } from "../../../middleware/device-admin.middleware";
import { deviceStaffMiddleware } from "../../../middleware/device-staff.middleware";
import { STAFF_DEVICE_TYPES } from "../../../shared/constants/device.constants";
import type { DeviceController } from "../device.controller";

const deviceRouter = Router();
const deviceController =
  container.resolve<DeviceController>("deviceController");

deviceRouter.get("/e", deviceController.deviceAuthCheck);

deviceRouter.post(
  "/admin/login",
  asyncHandler(deviceController.deviceAdminLogin),
);

// Logging to admin panel as a staff
deviceRouter.post(
  "/admin/staff-login",
  deviceStaffMiddleware,
  asyncHandler(deviceController.deviceAdminStaffLogin),
);

deviceRouter.patch(
  "/admin/terminal",
  deviceAdminMiddleware,
  asyncHandler(deviceController.mapOwnTerminal),
);

deviceRouter.post(
  "/staff/login",
  accessMiddleware({
    deviceType: STAFF_DEVICE_TYPES,
    allowWithoutStaff: true,
  }),
  asyncHandler(deviceController.deviceStaffLogin),
);

deviceRouter.post(
  "/staff/refresh",
  accessMiddleware({
    deviceType: STAFF_DEVICE_TYPES,
    allowWithoutStaff: true,
  }),
  asyncHandler(deviceController.refreshDeviceStaffSession),
);

deviceRouter.post(
  "/staff/logout",
  asyncHandler(deviceController.deviceStaffLogout),
);

export { deviceRouter };
