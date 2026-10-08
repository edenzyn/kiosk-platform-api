import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_SHIFT_READ_MANAGE_PERMS,
  ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { ShiftController } from "../shift.controller";

const userShiftRouter = Router();
const shiftController = container.resolve<ShiftController>("shiftController");

userShiftRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS],
    branch: [...BRANCH_SHIFT_READ_MANAGE_PERMS],
  }),
  asyncHandler(shiftController.getBusinessDayShifts),
);

userShiftRouter.post(
  "/:id/force-close",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BUSINESS_DAY_WRITE],
    branch: [UserPermissions.BRANCH_BUSINESS_DAY_WRITE],
  }),
  asyncHandler(shiftController.forceCloseShift),
);

export { userShiftRouter };
