import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { FinanceController } from "../finance.controller";

const userFinanceRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

userFinanceRouter.get(
  "/ex-rates",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BASIC],
    branch: [UserPermissions.BRANCH_BASIC],
  }),
  financeController.getExchangeRates,
);

export { userFinanceRouter };
