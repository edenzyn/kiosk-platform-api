import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import type { UserController } from "../../user/user.controller";

const resellerRouter = Router();
const userController = container.resolve<UserController>("userController");

resellerRouter.get(
  "/e",
  accessMiddleware(
    { reseller: [UserPermissions.RESELLER_BASIC] },
    UserTypeEnums.RESELLER,
  ),
  asyncHandler(userController.checkAuth),
);

export { resellerRouter };
