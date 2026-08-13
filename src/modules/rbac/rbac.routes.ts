import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import {
  BRANCH_PERMISSION_READ_MANAGE_PERMS,
  BRANCH_ROLE_READ_WRITE_PERMS,
  ORGANIZATION_PERMISSION_READ_MANAGE_PERMS,
  ORGANIZATION_ROLE_READ_WRITE_PERMS,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { RbacController } from "./rbac.controller";

const router = Router();
const rbacController = container.resolve<RbacController>("rbacController");

// ------------------
//  ROLES
// ------------------
router
  .route("/roles")
  .get(
    accessMiddleware({
      organization: ORGANIZATION_ROLE_READ_WRITE_PERMS,
      branch: BRANCH_ROLE_READ_WRITE_PERMS,
    }),
    asyncHandler(rbacController.getRolesByTenantAndScope),
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
      branch: [UserPermissions.BRANCH_ROLE_WRITE],
    }),
    asyncHandler(rbacController.createRole),
  );

router
  .route("/roles/:roleId")
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
      branch: [UserPermissions.BRANCH_ROLE_WRITE],
    }),
    asyncHandler(rbacController.updateRole),
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
      branch: [UserPermissions.BRANCH_ROLE_WRITE],
    }),
    asyncHandler(rbacController.deleteRole),
  );

router.post(
  "/roles/:roleId/assign",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
    branch: [UserPermissions.BRANCH_ROLE_WRITE],
  }),
  asyncHandler(rbacController.assignRole),
);

router
  .route("/roles/:roleId/users")
  .get(
    accessMiddleware({
      organization: ORGANIZATION_ROLE_READ_WRITE_PERMS,
      branch: BRANCH_ROLE_READ_WRITE_PERMS,
    }),
    asyncHandler(rbacController.getRoleUsers),
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
      branch: [UserPermissions.BRANCH_ROLE_WRITE],
    }),
    asyncHandler(rbacController.removeUserFromRole),
  );

router.get(
  "/users/:userId/roles",
  accessMiddleware({
    organization: ORGANIZATION_ROLE_READ_WRITE_PERMS,
    branch: BRANCH_ROLE_READ_WRITE_PERMS,
  }),
  asyncHandler(rbacController.getUserRoles),
);

router.post(
  "/roles/:roleId/duplicate",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
    branch: [UserPermissions.BRANCH_ROLE_WRITE],
  }),
  asyncHandler(rbacController.duplicateRole),
);

router.patch(
  "/roles/:roleId/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_ROLE_WRITE],
    branch: [UserPermissions.BRANCH_ROLE_WRITE],
  }),
  asyncHandler(rbacController.toggleRoleStatus),
);

// ------------------
//  PERMISSIONS
// ------------------
router.route("/permissions").get(
  accessMiddleware({
    organization: ORGANIZATION_PERMISSION_READ_MANAGE_PERMS,
    branch: BRANCH_PERMISSION_READ_MANAGE_PERMS,
  }),
  asyncHandler(rbacController.getPermissionsByScopeAndTenant),
);

router
  .route("/permissions/:permissionId")
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_PERMISSION_MANAGE],
      branch: [UserPermissions.BRANCH_PERMISSION_MANAGE],
    }),
    asyncHandler(rbacController.assignPermission),
  )
  .patch(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_PERMISSION_MANAGE],
      branch: [UserPermissions.BRANCH_PERMISSION_MANAGE],
    }),
    asyncHandler(rbacController.removePermission),
  );

export default router;
