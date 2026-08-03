import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import {
  BRANCH_TOP_SCOPED_ROLES,
  ORGANIZATION_TOP_ROLES,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { UserController } from "./user.controller";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/me", asyncHandler(userController.checkAuth));
router.get(
  "/",
  permissionCheck([
    UserPermissions.USER_READ,
    ...ORGANIZATION_TOP_ROLES,
    ...BRANCH_TOP_SCOPED_ROLES,
  ]),
  asyncHandler(userController.getUsersByTenant),
);

export default router;
