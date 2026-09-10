import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { MarketController } from "../market.controller";

const resellerMarketRouter = Router();
const marketController =
  container.resolve<MarketController>("marketController");

resellerMarketRouter.get(
  "/",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(marketController.getResellerMarkets),
);

export { resellerMarketRouter };
