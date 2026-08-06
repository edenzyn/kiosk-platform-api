import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import {
  ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_PERMISSIONS,
  ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
  PERMISSION_MANAGE_PERMISSIONS,
  PERMISSION_READ_PERMISSIONS,
  ROLE_READ_PERMISSIONS,
  ROLE_WRITE_PERMISSIONS,
} from "../../shared/constants/user-permission.constants";
import type { RbacController } from "./rbac.controller";

const router = Router();
const rbacController = container.resolve<RbacController>("rbacController");

router
  .route("/roles")
  .get(
    permissionCheck([
      ...ROLE_READ_PERMISSIONS,
      ...ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_PERMISSIONS,
    ]),
    asyncHandler(rbacController.getRolesByTenant),
  )
  .post(
    permissionCheck([
      ...ROLE_WRITE_PERMISSIONS,
      ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
    ]),
    asyncHandler(rbacController.createRole),
  );

router.put(
  "/roles/:roleId",
  permissionCheck([
    ...ROLE_WRITE_PERMISSIONS,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
  ]),
  asyncHandler(rbacController.updateRole),
);

router
  .route("/permissions")
  .get(
    permissionCheck([
      ...PERMISSION_READ_PERMISSIONS,
      ...ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_PERMISSIONS,
    ]),
    asyncHandler(rbacController.getPermissionsByScopeAndTenant),
  );

router.put(
  "/permissions/:permissionId",
  permissionCheck([
    ...PERMISSION_MANAGE_PERMISSIONS,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
  ]),
  asyncHandler(rbacController.assignPermission),
);

router.patch(
  "/permissions/:permissionId",
  permissionCheck([
    ...PERMISSION_MANAGE_PERMISSIONS,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
  ]),
  asyncHandler(rbacController.removePermission),
);

router.post(
  "/user-role-mappers",
  permissionCheck([
    ...ROLE_WRITE_PERMISSIONS,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
  ]),
  asyncHandler(rbacController.createUserRoleMapper),
);

export default router;
