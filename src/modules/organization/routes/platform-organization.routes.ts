import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_ORGANIZATION_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { OrganizationController } from "../organization.controller";

const platformOrganizationRouter = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

platformOrganizationRouter.post(
  "/invite",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_ORGANIZATION_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(organizationController.invite),
);

platformOrganizationRouter.get(
  "/",
  accessMiddleware(
    { platform: PLATFORM_ORGANIZATION_READ_WRITE_PERMS },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(organizationController.getOrganizations),
);

platformOrganizationRouter.patch(
  "/:id/status",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_ORGANIZATION_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(organizationController.toggleOrganizationStatus),
);

export { platformOrganizationRouter };
