import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { FinanceController } from "../finance.controller";

const userTaxRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

userTaxRouter
  .route("/profile")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    financeController.getTaxProfile,
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    financeController.updateTaxProfile,
  );

export { userTaxRouter };
