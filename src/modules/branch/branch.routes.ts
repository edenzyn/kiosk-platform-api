import { Router } from "express";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import { BRANCH_TOP_SCOPED_PERMISSIONS } from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { BranchController } from "./branch.controller";

const branchRouter = Router();
const branchController =
  container.resolve<BranchController>("branchController");

branchRouter
  .route("/")
  .get(
    accessMiddleware({
      organization: [
        UserPermissions.ORGANIZATION_ALL_WRITE,
        UserPermissions.ORGANIZATION_BRANCH_WRITE,
        UserPermissions.ORGANIZATION_BRANCH_READ,
      ],
      branch: [...BRANCH_TOP_SCOPED_PERMISSIONS],
    }),
    branchController.getBranches,
  )
  .post(
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
  "/options",
  accessMiddleware({
    organization: [
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
    ],
    branch: [UserPermissions.BRANCH_READ],
  }),
  branchController.getBranchesForFilters,
);

branchRouter.route("/details").put(
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
    branch: [UserPermissions.BRANCH_UPDATE],
  }),
  branchController.updateDetails,
);

branchRouter
  .route("/settings")
  .get(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    branchController.getSettings,
  )
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    branchController.updateSettings,
  );

branchRouter
  .route("/settings/brand-logo")
  .put(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    branchController.requestBrandLogoUpload,
  )
  .patch(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    branchController.finalizeBrandLogoUpload,
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_BRANCH_WRITE],
      branch: [UserPermissions.BRANCH_UPDATE],
    }),
    branchController.deleteBrandLogo,
  );

branchRouter.route("/:id").put(
  accessMiddleware({
    organization: [
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
    ],
    branch: [],
  }),
  branchController.update,
);

export { branchRouter };
