import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_LICENSE_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { LicenseController } from "../license.controller";

const platformLicenseRouter = Router();
const licenseController =
  container.resolve<LicenseController>("licenseController");

platformLicenseRouter
  .route("/discount-rules")
  .get(
    accessMiddleware(
      { platform: PLATFORM_LICENSE_READ_WRITE_PERMS },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(licenseController.getPlatformDiscountRules),
  )
  .post(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_LICENSE_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(licenseController.createDiscountRule),
  );

platformLicenseRouter.patch(
  "/discount-rules/:id/status",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_LICENSE_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(licenseController.toggleDiscountRuleStatus),
);

platformLicenseRouter.get(
  "/pricing",
  accessMiddleware(
    { platform: PLATFORM_LICENSE_READ_WRITE_PERMS },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(licenseController.getPlatformPricingPlans),
);

export { platformLicenseRouter };
