import { Router } from "express";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import {
  BRANCH_DEVICE_READ_WRITE_PERMS,
  ORGANIZATION_DEVICE_READ_WRITE_PERMS,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { DeviceController } from "./device.controller";

const deviceRouter = Router();
const deviceController =
  container.resolve<DeviceController>("deviceController");

deviceRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_DEVICE_READ_WRITE_PERMS],
    branch: [...BRANCH_DEVICE_READ_WRITE_PERMS],
  }),
  deviceController.getDevices,
);

deviceRouter.post(
  "/",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.createDevice,
);

deviceRouter.put(
  "/:id",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.updateDevice,
);

deviceRouter.patch(
  "/:id/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.toggleDeviceStatus,
);

export { deviceRouter };
