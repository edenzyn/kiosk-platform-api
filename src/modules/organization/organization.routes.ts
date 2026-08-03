import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { ORGANIZATION_TOP_ROLES } from "../../shared/constants/user-permission.constants";
import type { OrganizationController } from "./organization.controller";

const router = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

router
  .route("/")
  .get(
    permissionCheck([...ORGANIZATION_TOP_ROLES]),
    asyncHandler(organizationController.list),
  );

export default router;
