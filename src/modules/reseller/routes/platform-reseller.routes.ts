import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_RESELLER_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { ResellerController } from "../reseller.controller";

const platformResellerRouter = Router();
const resellerController =
  container.resolve<ResellerController>("resellerController");

platformResellerRouter.post(
  "/invite",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_RESELLER_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(resellerController.inviteReseller),
);

platformResellerRouter.get(
  "/invitations",
  accessMiddleware(
    { platform: PLATFORM_RESELLER_READ_WRITE_PERMS },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(resellerController.getInvitations),
);

platformResellerRouter.get(
  "/",
  accessMiddleware(
    { platform: PLATFORM_RESELLER_READ_WRITE_PERMS },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(resellerController.getResellers),
);

platformResellerRouter.patch(
  "/:id/status",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_RESELLER_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(resellerController.toggleResellerStatus),
);

export { platformResellerRouter };
