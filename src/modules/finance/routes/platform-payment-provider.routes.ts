import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_PAYMENT_PROVIDER_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { PaymentProviderController } from "../controllers/payment-provider.controller";

const platformPaymentProviderRouter = Router();
const paymentProviderController = container.resolve<PaymentProviderController>(
  "paymentProviderController",
);

platformPaymentProviderRouter
  .route("/")
  .get(
    accessMiddleware(
      { platform: PLATFORM_PAYMENT_PROVIDER_READ_WRITE_PERMS },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentProviderController.getPaymentProviders),
  )
  .post(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_PAYMENT_PROVIDER_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentProviderController.createPaymentProvider),
  );

platformPaymentProviderRouter
  .route("/:id")
  .patch(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_PAYMENT_PROVIDER_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentProviderController.updatePaymentProvider),
  );

platformPaymentProviderRouter
  .route("/:id/status")
  .patch(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_PAYMENT_PROVIDER_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentProviderController.togglePaymentProviderStatus),
  );

export { platformPaymentProviderRouter };
