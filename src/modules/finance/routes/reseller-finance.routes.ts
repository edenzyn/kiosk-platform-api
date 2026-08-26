import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { FinanceController } from "../finance.controller";

const resellerFinanceRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

resellerFinanceRouter.get(
  "/ex-rates",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  financeController.getExchangeRates,
);

export { resellerFinanceRouter };
