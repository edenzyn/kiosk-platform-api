import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import {
  ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_ROLES,
  ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { RbacController } from "./rbac.controller";

const router = Router();
const rbacController = container.resolve<RbacController>("rbacController");

router
  .route("/roles")
  .post(
    permissionCheck([
      UserPermissions.ROLE_CREATE,
      ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
    ]),
    asyncHandler(rbacController.createRole),
  )
  .get(
    permissionCheck([
      UserPermissions.ROLE_READ,
      ...ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_ROLES,
    ]),
    asyncHandler(rbacController.getRolesByTenant),
  );

router
  .route("/permissions")
  .get(
    permissionCheck([
      UserPermissions.PERMISSION_READ,
      ...ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_ROLES,
    ]),
    asyncHandler(rbacController.getPermissionsByScopeAndTenant),
  );

router.put(
  "/permissions/:permissionId",
  permissionCheck([
    UserPermissions.PERMISSION_ASSIGN,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
  ]),
  asyncHandler(rbacController.assignPermission),
);

router.patch(
  "/permissions/:permissionId",
  permissionCheck([
    UserPermissions.PERMISSION_ASSIGN,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
  ]),
  asyncHandler(rbacController.removePermission),
);

router.post(
  "/user-role-mappers",
  permissionCheck([
    UserPermissions.ROLE_UPDATE,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
  ]),
  asyncHandler(rbacController.createUserRoleMapper),
);

export default router;
