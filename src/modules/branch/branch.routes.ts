import { Router } from "express";
import { container } from "../../config/container";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionCheck } from "../../middleware/permission-check.middleware";
import { ORG_BRANCH_TOP_SCOPED_WRITE_ROLES } from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { BranchController } from "./branch.controller";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter.use(authMiddleware);

branchRouter.post(
  "/",
  permissionCheck([...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES]),
  branchController.create,
);

branchRouter.get(
  "/",
  permissionCheck([
    UserPermissions.BRANCH_ALL_READ,
    ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
  ]),
  branchController.list,
);

export { branchRouter };
