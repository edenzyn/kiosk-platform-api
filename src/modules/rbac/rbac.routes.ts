import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import type { RbacController } from "./rbac.controller";

const router = Router();
const rbacController = container.resolve<RbacController>("rbacController");

router
  .route("/roles")
  .post(asyncHandler(rbacController.createRole))
  .get(asyncHandler(rbacController.getRolesByTenant));

router
  .route("/permissions")
  .get(asyncHandler(rbacController.getPermissionsByTenant));

router.post(
  "/permission-mappers",
  asyncHandler(rbacController.createPermissionMapper),
);
router.post(
  "/user-role-mappers",
  asyncHandler(rbacController.createUserRoleMapper),
);

export default router;
