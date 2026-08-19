import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { UserController } from "../../user/user.controller";

const resellerRouter = Router();
const userController = container.resolve<UserController>("userController");

resellerRouter.get(
  "/e",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.checkAuth),
);
resellerRouter.patch(
  "/settings",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.updateSettings),
);
resellerRouter.patch(
  "/password",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.changePassword),
);
resellerRouter.get(
  "/2fa/status",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.getMyTwoFactorStatus),
);
resellerRouter.post(
  "/2fa/setup",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.setupTwoFactor),
);
resellerRouter.post(
  "/2fa/enable",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.enableTwoFactor),
);
resellerRouter.post(
  "/2fa/disable",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.disableTwoFactor),
);

export { resellerRouter };
