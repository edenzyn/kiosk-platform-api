import { Router } from "express";
import { container } from "../../config/container";
import type { OrganizationController } from "./organization.controller";
import asyncHandler from "express-async-handler";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { ORGANIZATION_TOP_ROLES } from "../../shared/constants/user-permission.constants";

const router = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

router
  .route("/")
  .post(
    permissionCheck([UserPermissions.ORGANIZATION_WRITE]),
    asyncHandler(organizationController.create),
  )
  .get(
    permissionCheck([...ORGANIZATION_TOP_ROLES]),
    asyncHandler(organizationController.list),
  );

export default router;
