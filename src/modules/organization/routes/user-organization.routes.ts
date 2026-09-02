import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { OrganizationController } from "../organization.controller";

const userOrganizationRouter = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

userOrganizationRouter
  .route("/details")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.getMyOrganization,
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.updateMyOrganization,
  );

userOrganizationRouter
  .route("/settings")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.getMyOrganizationSettings,
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.updateMyOrganizationSettings,
  );

export { userOrganizationRouter };
