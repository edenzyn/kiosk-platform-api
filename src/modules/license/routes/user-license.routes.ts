import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_LICENSE_READ_WRITE_PERMS,
  ORGANIZATION_LICENSE_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { LicenseController } from "../license.controller";

const userLicenseRouter = Router();
const licenseController =
  container.resolve<LicenseController>("licenseController");

userLicenseRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  licenseController.getLicenses,
);

userLicenseRouter.get(
  "/pricing",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  licenseController.getPricingPlans,
);

userLicenseRouter.get(
  "/discount-rules",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  licenseController.getDiscountRules,
);

userLicenseRouter.post(
  "/purchase",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_LICENSE_WRITE],
    branch: [UserPermissions.BRANCH_LICENSE_WRITE],
  }),
  licenseController.purchaseLicense,
);

userLicenseRouter.post(
  "/:id/assign-branch",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_LICENSE_WRITE],
    branch: [UserPermissions.BRANCH_LICENSE_WRITE],
  }),
  licenseController.assignLicenseToBranch,
);

userLicenseRouter.post(
  "/:id/assign-device",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_LICENSE_WRITE],
    branch: [UserPermissions.BRANCH_LICENSE_WRITE],
  }),
  licenseController.assignLicenseToDevice,
);

userLicenseRouter.post(
  "/:id/extend",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_LICENSE_WRITE],
    branch: [UserPermissions.BRANCH_LICENSE_WRITE],
  }),
  licenseController.extendLicense,
);

userLicenseRouter.get(
  "/:id/history",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  licenseController.getLicenseHistory,
);

userLicenseRouter.get(
  "/:id/details",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  licenseController.getLicenseDetails,
);

export { userLicenseRouter };
