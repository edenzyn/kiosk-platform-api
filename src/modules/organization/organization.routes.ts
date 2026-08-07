import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { OrganizationController } from "./organization.controller";

const router = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

router
  .route("/")
  .get(
    accessMiddleware({
      organization: [
        UserPermissions.ORGANIZATION_ALL_WRITE,
        UserPermissions.ORGANIZATION_ALL_READ,
      ],
    }),
    asyncHandler(organizationController.list),
  );

export default router;
