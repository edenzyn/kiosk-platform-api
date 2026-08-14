import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { PlatformController } from "./platform.controller";

const router = Router();
const controller = container.resolve<PlatformController>("platformController");

router.get(
  "/e",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(controller.checkAuth),
);

export default router;
