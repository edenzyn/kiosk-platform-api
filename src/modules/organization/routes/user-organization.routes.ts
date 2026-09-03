import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { fileParserMiddleware } from "../../../middleware/file-parser.middleware";
import { FILE_UPLOAD_CONFIG } from "../../../shared/constants/file-upload.constants";
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

userOrganizationRouter
  .route("/settings/brand-logo")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.getBrandLogoUrl,
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    fileParserMiddleware({
      acceptedTypes: FILE_UPLOAD_CONFIG.BRAND_LOGO.acceptedTypes,
      maxSizeBytes: FILE_UPLOAD_CONFIG.BRAND_LOGO.maxSizeBytes,
    }),
    organizationController.uploadBrandLogo,
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_UPDATE],
    }),
    organizationController.deleteBrandLogo,
  );

export { userOrganizationRouter };
