import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { TaxController } from "../controllers/tax.controller";

const userTaxRouter = Router();
const taxController =
  container.resolve<TaxController>("taxController");

userTaxRouter
  .route("/profile")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    taxController.getTaxProfile,
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    taxController.updateTaxProfile,
  );

userTaxRouter.get(
  "/profile/branches/:branchId",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
  }),
  taxController.getBranchTaxProfile,
);

export { userTaxRouter };
