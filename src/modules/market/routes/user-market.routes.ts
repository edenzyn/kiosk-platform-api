import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_LICENSE_READ_WRITE_PERMS,
  ORGANIZATION_LICENSE_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import type { MarketController } from "../market.controller";

const userMarketRouter = Router();
const marketController =
  container.resolve<MarketController>("marketController");

userMarketRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_LICENSE_READ_WRITE_PERMS],
    branch: [...BRANCH_LICENSE_READ_WRITE_PERMS],
  }),
  asyncHandler(marketController.getTenantMarkets),
);

export { userMarketRouter };
