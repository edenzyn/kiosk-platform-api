import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_PAYMENT_PROVIDER_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { PaymentController } from "../controllers/payment.controller";

const platformPaymentRouter = Router();
const paymentController = container.resolve<PaymentController>(
  "paymentController",
);

platformPaymentRouter
  .route("/")
  .get(
    accessMiddleware(
      { platform: PLATFORM_PAYMENT_PROVIDER_READ_WRITE_PERMS },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentController.getPaymentProviders),
  );

platformPaymentRouter
  .route("/:id")
  .patch(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_PAYMENT_PROVIDER_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentController.updatePaymentProvider),
  );

platformPaymentRouter
  .route("/:id/status")
  .patch(
    accessMiddleware(
      { platform: [UserPermissions.PLATFORM_PAYMENT_PROVIDER_WRITE] },
      UserTypeEnums.PLATFORM,
    ),
    asyncHandler(paymentController.togglePaymentProviderStatus),
  );

export { platformPaymentRouter };
