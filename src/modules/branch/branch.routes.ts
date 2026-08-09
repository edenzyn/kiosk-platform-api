import { Router } from "express";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { BRANCH_TOP_SCOPED_PERMISSIONS } from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { BranchController } from "./branch.controller";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter.use(authMiddleware);

branchRouter.post(
  "/",
  accessMiddleware({
    organization: [
      UserPermissions.ORGANIZATION_ALL_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
    ],
    branch: [],
  }),
  branchController.create,
);

branchRouter.get(
  "/",
  accessMiddleware({
    organization: [
      UserPermissions.ORGANIZATION_ALL_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
    ],
    branch: [...BRANCH_TOP_SCOPED_PERMISSIONS],
  }),
  branchController.getBranches,
);

branchRouter.put(
  "/:id",
  accessMiddleware({
    organization: [
      UserPermissions.ORGANIZATION_ALL_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
    ],
    branch: [],
  }),
  branchController.update,
);

export { branchRouter };
