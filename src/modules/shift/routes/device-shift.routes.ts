import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";
import type { ShiftController } from "../shift.controller";

const deviceShiftRouter = Router();
const shiftController = container.resolve<ShiftController>("shiftController");

deviceShiftRouter.get(
  "/current",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.getCurrentShift),
);

deviceShiftRouter.get(
  "/current/summary",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.getShiftSummary),
);

deviceShiftRouter.get(
  "/managers",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.getShiftManagers),
);

deviceShiftRouter.post(
  "/verification-code",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.sendShiftVerificationCode),
);

deviceShiftRouter.post(
  "/start",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.startShift),
);

deviceShiftRouter.post(
  "/end",
  accessMiddleware({ deviceType: [DeviceTypeEnum.COUNTER] }),
  asyncHandler(shiftController.endShift),
);

export { deviceShiftRouter };
