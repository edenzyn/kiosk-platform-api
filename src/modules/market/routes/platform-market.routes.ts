import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { PLATFORM_MARKET_READ_WRITE_PERMS } from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { MarketController } from "../market.controller";

const platformMarketRouter = Router();
const marketController =
  container.resolve<MarketController>("marketController");

platformMarketRouter.get(
  "/active",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_BASIC] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(marketController.getActiveMarkets),
);

platformMarketRouter.get(
  "/",
  accessMiddleware(
    { platform: PLATFORM_MARKET_READ_WRITE_PERMS },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(marketController.getPlatformMarkets),
);

platformMarketRouter.post(
  "/",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_MARKET_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(marketController.createMarket),
);

platformMarketRouter.patch(
  "/:id",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_MARKET_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(marketController.updateMarket),
);

platformMarketRouter.patch(
  "/:id/status",
  accessMiddleware(
    { platform: [UserPermissions.PLATFORM_MARKET_WRITE] },
    UserTypeEnums.PLATFORM,
  ),
  asyncHandler(marketController.toggleMarketStatus),
);

export { platformMarketRouter };
