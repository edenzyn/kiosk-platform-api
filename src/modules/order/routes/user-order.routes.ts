import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_ORDER_READ_WRITE_PERMS,
  ORGANIZATION_ORDER_READ_PERMS,
} from "../../../shared/constants/user-permission.constants";
import type { OrderController } from "../order.controller";

const userOrderRouter = Router();
const orderController = container.resolve<OrderController>("orderController");

userOrderRouter.get(
  "/",
  accessMiddleware({
    organization: [...ORGANIZATION_ORDER_READ_PERMS],
    branch: [...BRANCH_ORDER_READ_WRITE_PERMS],
  }),
  asyncHandler(orderController.getOrders),
);

userOrderRouter.get(
  "/live-counts",
  accessMiddleware({
    organization: [...ORGANIZATION_ORDER_READ_PERMS],
    branch: [...BRANCH_ORDER_READ_WRITE_PERMS],
  }),
  asyncHandler(orderController.getLiveOrderCounts),
);

userOrderRouter.get(
  "/:id",
  accessMiddleware({
    organization: [...ORGANIZATION_ORDER_READ_PERMS],
    branch: [...BRANCH_ORDER_READ_WRITE_PERMS],
  }),
  asyncHandler(orderController.getOrderDetails),
);

export { userOrderRouter };
