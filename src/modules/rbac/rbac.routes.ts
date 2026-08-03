import { Router } from "express";
import { container } from "../../config/container";
import type { RbacController } from "./rbac.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const rbacController = container.resolve<RbacController>("rbacController");

router
  .route("/roles")
  .post(asyncHandler(rbacController.createRole))
  .get(asyncHandler(rbacController.getRoles));
router.post("/permissions", asyncHandler(rbacController.createPermission));
router.post(
  "/permission-mappers",
  asyncHandler(rbacController.createPermissionMapper),
);
router.post(
  "/user-role-mappers",
  asyncHandler(rbacController.createUserRoleMapper),
);

export default router;
