import { Router } from "express";
import { container } from "../../config/container";
import type { UserController } from "./user.controller";
import asyncHandler from "express-async-handler";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/me", asyncHandler(userController.checkAuth));
router.get(
  "/",
  permissionCheck([
    UserPermissions.USER_READ,
    UserPermissions.ORGANIZATION_READ,
    UserPermissions.ORGANIZATION_WRITE,
    UserPermissions.BRANCH_READ,
    UserPermissions.BRANCH_WRITE,
  ]),
  asyncHandler(userController.getUsers),
);

export default router;
