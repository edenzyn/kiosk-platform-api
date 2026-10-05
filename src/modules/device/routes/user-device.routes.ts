import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_DEVICE_READ_WRITE_PERMS,
  ORGANIZATION_DEVICE_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { DeviceController } from "../device.controller";

const userDeviceRouter = Router();
const deviceController =
  container.resolve<DeviceController>("deviceController");

userDeviceRouter
  .route("/")
  .get(
    accessMiddleware({
      organization: [...ORGANIZATION_DEVICE_READ_WRITE_PERMS],
      branch: [...BRANCH_DEVICE_READ_WRITE_PERMS],
    }),
    deviceController.getDevices,
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
      branch: [UserPermissions.BRANCH_DEVICE_WRITE],
    }),
    deviceController.createDevice,
  );

userDeviceRouter.get(
  "/:id",
  accessMiddleware({
    organization: [...ORGANIZATION_DEVICE_READ_WRITE_PERMS],
    branch: [...BRANCH_DEVICE_READ_WRITE_PERMS],
  }),
  deviceController.getDeviceDetails,
);

userDeviceRouter.get(
  "/:id/logs",
  accessMiddleware({
    organization: [...ORGANIZATION_DEVICE_READ_WRITE_PERMS],
    branch: [...BRANCH_DEVICE_READ_WRITE_PERMS],
  }),
  deviceController.getDeviceLogs,
);

userDeviceRouter.delete(
  "/:id/session",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.revokeDeviceSession,
);

userDeviceRouter.put(
  "/:id",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.updateDevice,
);

userDeviceRouter.patch(
  "/:id/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.toggleDeviceStatus,
);

userDeviceRouter.patch(
  "/:id/terminal",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_DEVICE_WRITE],
    branch: [UserPermissions.BRANCH_DEVICE_WRITE],
  }),
  deviceController.mapDeviceTerminal,
);

export { userDeviceRouter };
