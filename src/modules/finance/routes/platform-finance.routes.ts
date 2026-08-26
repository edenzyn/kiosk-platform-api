import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { FinanceController } from "../finance.controller";

const platformFinanceRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

platformFinanceRouter.get(
  "/exchange-rates",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  financeController.getExchangeRates,
);

export { platformFinanceRouter };
