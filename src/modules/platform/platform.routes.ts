import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { UserController } from "../user/user.controller";
import type { PlatformController } from "./platform.controller";

const router = Router();
const controller = container.resolve<PlatformController>("platformController");
const userController = container.resolve<UserController>("userController");

router.get(
  "/e",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(controller.checkAuth),
);
router.patch(
  "/settings",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.updateSettings),
);
router.patch(
  "/password",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.changePassword),
);
router.get(
  "/2fa/status",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.getMyTwoFactorStatus),
);
router.post(
  "/2fa/setup",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.setupTwoFactor),
);
router.post(
  "/2fa/enable",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.enableTwoFactor),
);
router.post(
  "/2fa/disable",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.disableTwoFactor),
);

export default router;
