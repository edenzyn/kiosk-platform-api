import { Router } from "express";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { BranchController } from "./branch.controller";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter.use(authMiddleware);

branchRouter.post(
  "/",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_ALL_WRITE],
    branch: [UserPermissions.BRANCH_ALL_WRITE],
  }),
  branchController.create,
);

branchRouter.get(
  "/",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_ALL_WRITE],
    branch: [UserPermissions.BRANCH_ALL_READ, UserPermissions.BRANCH_ALL_WRITE],
  }),
  branchController.getBranches,
);

export { branchRouter };
