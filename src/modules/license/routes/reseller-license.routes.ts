import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { LicenseController } from "../license.controller";

const resellerLicenseRouter = Router();
const licenseController =
  container.resolve<LicenseController>("licenseController");

resellerLicenseRouter.get(
  "/",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getLicensesForReseller,
);

resellerLicenseRouter.get(
  "/pricing",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getPricingPlans,
);

resellerLicenseRouter.get(
  "/discount-rules",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getResellerDiscountRules,
);

resellerLicenseRouter.post(
  "/purchase",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.purchaseLicenseAsReseller,
);

export { resellerLicenseRouter };
