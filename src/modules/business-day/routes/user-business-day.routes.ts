import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_BUSINESS_DAY_READ_WRITE_PERMS,
  ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { BusinessDayController } from "../business-day.controller";

const userBusinessDayRouter = Router();
const businessDayController = container.resolve<BusinessDayController>(
  "businessDayController",
);

userBusinessDayRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS],
    branch: [...BRANCH_BUSINESS_DAY_READ_WRITE_PERMS],
  }),
  asyncHandler(businessDayController.getBusinessDays),
);

userBusinessDayRouter.get(
  "/current",
  accessMiddleware({
    organization: [...ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS],
    branch: [...BRANCH_BUSINESS_DAY_READ_WRITE_PERMS],
  }),
  asyncHandler(businessDayController.getCurrentBusinessDay),
);

userBusinessDayRouter.post(
  "/open",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BUSINESS_DAY_WRITE],
    branch: [UserPermissions.BRANCH_BUSINESS_DAY_WRITE],
  }),
  asyncHandler(businessDayController.openBusinessDay),
);

userBusinessDayRouter.post(
  "/close",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BUSINESS_DAY_WRITE],
    branch: [UserPermissions.BRANCH_BUSINESS_DAY_WRITE],
  }),
  asyncHandler(businessDayController.closeBusinessDay),
);

userBusinessDayRouter.post(
  "/pause-orders",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BUSINESS_DAY_WRITE],
    branch: [UserPermissions.BRANCH_BUSINESS_DAY_WRITE],
  }),
  asyncHandler(businessDayController.pauseOrders),
);

userBusinessDayRouter.post(
  "/resume-orders",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BUSINESS_DAY_WRITE],
    branch: [UserPermissions.BRANCH_BUSINESS_DAY_WRITE],
  }),
  asyncHandler(businessDayController.resumeOrders),
);

userBusinessDayRouter.get(
  "/:id/logs",
  accessMiddleware({
    organization: [...ORGANIZATION_BUSINESS_DAY_READ_WRITE_PERMS],
    branch: [...BRANCH_BUSINESS_DAY_READ_WRITE_PERMS],
  }),
  asyncHandler(businessDayController.getBusinessDayLogs),
);

export { userBusinessDayRouter };
