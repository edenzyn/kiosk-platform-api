import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { PaymentController } from "../controllers/payment.controller";

const userPaymentRouter = Router();
const paymentController = container.resolve<PaymentController>(
  "paymentController",
);

userPaymentRouter
  .route("/")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    asyncHandler(paymentController.getTenantPaymentConfigs),
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    asyncHandler(paymentController.saveTenantPaymentConfig),
  );

userPaymentRouter.put(
  "/cash",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
    branch: [UserPermissions.BRANCH_UPDATE],
  }),
  asyncHandler(paymentController.saveCashPaymentConfig),
);

export { userPaymentRouter };
