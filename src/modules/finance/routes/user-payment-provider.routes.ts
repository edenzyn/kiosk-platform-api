import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { PaymentProviderController } from "../controllers/payment-provider.controller";

const userPaymentProviderRouter = Router();
const paymentProviderController = container.resolve<PaymentProviderController>(
  "paymentProviderController",
);

userPaymentProviderRouter
  .route("/")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    asyncHandler(paymentProviderController.getTenantPaymentConfigs),
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    asyncHandler(paymentProviderController.saveTenantPaymentConfig),
  );

userPaymentProviderRouter.put(
  "/cash",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
    branch: [UserPermissions.BRANCH_UPDATE],
  }),
  asyncHandler(paymentProviderController.saveCashPaymentConfig),
);

userPaymentProviderRouter.post(
  "/test",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
    branch: [UserPermissions.BRANCH_UPDATE],
  }),
  asyncHandler(paymentProviderController.testTenantPaymentConfig),
);

export { userPaymentProviderRouter };
