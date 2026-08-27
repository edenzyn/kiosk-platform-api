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
  licenseController.initiateLicensePurchaseAsReseller,
);

resellerLicenseRouter.post(
  "/purchase/verify",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.verifyLicensePurchaseAsReseller,
);

resellerLicenseRouter.post(
  "/purchase/cancel",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.cancelLicensePurchase,
);

resellerLicenseRouter.get(
  "/redeemable",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getAvailableLicensesForRedemption,
);

resellerLicenseRouter
  .route("/redemption-codes")
  .get(
    accessMiddleware(
      { reseller: [UserPermissions.RESELLER_BASIC] },
      UserTypeEnums.RESELLER,
    ),
    licenseController.getRedemptionCodesForReseller,
  )
  .post(
    accessMiddleware(
      { reseller: [UserPermissions.RESELLER_BASIC] },
      UserTypeEnums.RESELLER,
    ),
    licenseController.generateRedemptionCode,
  );

resellerLicenseRouter
  .route("/redemption-codes/:id")
  .get(
    accessMiddleware(
      { reseller: [UserPermissions.RESELLER_BASIC] },
      UserTypeEnums.RESELLER,
    ),
    licenseController.getRedemptionCodeDetails,
  )
  .delete(
    accessMiddleware(
      { reseller: [UserPermissions.RESELLER_BASIC] },
      UserTypeEnums.RESELLER,
    ),
    licenseController.revokeRedemptionCode,
  );

resellerLicenseRouter.patch(
  "/redemption-codes/:id/verify",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.verifyRedemptionCode,
);

resellerLicenseRouter.get(
  "/:id/history",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getLicenseHistoryForReseller,
);

resellerLicenseRouter.get(
  "/:id/details",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  licenseController.getLicenseDetailsForReseller,
);

export { resellerLicenseRouter };
