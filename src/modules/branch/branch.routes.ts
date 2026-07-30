import { Router } from "express";
import { container } from "../../config/container";
import type { BranchController } from "./branch.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { ORG_BRANCH_TOP_WRITE_ROLES } from "../../shared/constants/user-permission.constants";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter.use(authMiddleware);

branchRouter.post(
  "/",
  permissionCheck([...ORG_BRANCH_TOP_WRITE_ROLES]),
  branchController.create,
);

branchRouter.get(
  "/",
  permissionCheck([UserPermissions.BRANCH_READ, ...ORG_BRANCH_TOP_WRITE_ROLES]),
  branchController.list,
);

export { branchRouter };
