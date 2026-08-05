import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import {
  BRANCH_TOP_SCOPED_PERMISSIONS,
  ORGANIZATION_TOP_PERMISSIONS,
  USER_CREATE_PERMISSIONS,
  USER_READ_PERMISSIONS,
} from "../../shared/constants/user-permission.constants";
import type { UserController } from "./user.controller";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/me", asyncHandler(userController.checkAuth));
router.get(
  "/",
  permissionCheck([
    ...USER_READ_PERMISSIONS,
    ...ORGANIZATION_TOP_PERMISSIONS,
    ...BRANCH_TOP_SCOPED_PERMISSIONS,
  ]),
  asyncHandler(userController.getUsersByTenant),
);
router.post(
  "/invite",
  permissionCheck([
    ...USER_CREATE_PERMISSIONS,
    ...ORGANIZATION_TOP_PERMISSIONS,
    ...BRANCH_TOP_SCOPED_PERMISSIONS,
  ]),
  asyncHandler(userController.inviteUser),
);

export default router;
