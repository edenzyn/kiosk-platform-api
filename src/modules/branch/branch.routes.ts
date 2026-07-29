import { Router } from "express";
import { container } from "../../config/container";
import type { BranchController } from "./branch.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter.use(authMiddleware);

branchRouter.post(
  "/",
  permissionCheck([
    UserPermissions.ALL_WRITE,
    UserPermissions.BRANCH_CREATE,
  ]),
  branchController.create,
);

branchRouter.get(
  "/",
  permissionCheck([
    UserPermissions.ALL_READ,
    UserPermissions.BRANCH_READ,
  ]),
  branchController.list,
);

export { branchRouter };
