import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_TAX_READ_WRITE_PERMS,
  ORGANIZATION_TAX_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { FinanceController } from "../finance.controller";

const userTaxRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

userTaxRouter
  .route("/profiles")
  .get(
    accessMiddleware({
      organization: [...ORGANIZATION_TAX_READ_WRITE_PERMS],
      branch: [...BRANCH_TAX_READ_WRITE_PERMS],
    }),
    financeController.getTaxProfiles,
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_TAX_WRITE],
      branch: [UserPermissions.BRANCH_TAX_WRITE],
    }),
    financeController.createTaxProfile,
  );

userTaxRouter.put(
  "/profiles/:id",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_TAX_WRITE],
    branch: [UserPermissions.BRANCH_TAX_WRITE],
  }),
  financeController.updateTaxProfile,
);

userTaxRouter.patch(
  "/profiles/:id/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_TAX_WRITE],
    branch: [UserPermissions.BRANCH_TAX_WRITE],
  }),
  financeController.updateTaxProfileStatus,
);

export { userTaxRouter };
