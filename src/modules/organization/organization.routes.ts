import { Router } from "express";
import { container } from "../../config/container";
import type { OrganizationController } from "./organization.controller";
import asyncHandler from "express-async-handler";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";

const router = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

router
  .route("/")
  .post(
    permissionCheck([
      UserPermissions.ALL_WRITE,
      UserPermissions.ORGANIZATION_CREATE,
    ]),
    asyncHandler(organizationController.create),
  )
  .get(
    permissionCheck([
      UserPermissions.ALL_READ,
      UserPermissions.ORGANIZATION_READ,
    ]),
    asyncHandler(organizationController.list),
  );



export default router;
