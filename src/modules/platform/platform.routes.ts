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
  "/sessions",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.listSessions),
);
router.delete(
  "/sessions/others",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.revokeOtherSessions),
);
router.delete(
  "/sessions/:sessionId",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.revokeSession),
);
router.patch(
  "/profile",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.updateProfile),
);
router.post(
  "/profile/email/request-change",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.requestEmailChange),
);
router.post(
  "/profile/email/confirm-change",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.confirmEmailChange),
);
router.post(
  "/profile/mobile/request-change",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.requestMobileChange),
);
router.post(
  "/profile/mobile/confirm-change",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(userController.confirmMobileChange),
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
