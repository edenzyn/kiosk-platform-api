import { Router } from "express";
import { container } from "../../../config/container";
import { accessMiddleware } from "../../../middleware/access.middleware";
import {
  BRANCH_MENU_READ_WRITE_PERMS,
  ORGANIZATION_MENU_READ_WRITE_PERMS,
} from "../../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { MenuController } from "../menu.controller";

const userMenuRouter = Router();
const menuController = container.resolve<MenuController>("menuController");

userMenuRouter
  .route("/categories")
  .get(
    accessMiddleware({
      organization: [...ORGANIZATION_MENU_READ_WRITE_PERMS],
      branch: [...BRANCH_MENU_READ_WRITE_PERMS],
    }),
    menuController.getCategories,
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.createCategory,
  );

userMenuRouter
  .route("/items")
  .get(
    accessMiddleware({
      organization: [...ORGANIZATION_MENU_READ_WRITE_PERMS],
      branch: [...BRANCH_MENU_READ_WRITE_PERMS],
    }),
    menuController.getItems,
  )
  .post(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.createItem,
  );

userMenuRouter.put(
  "/categories/image",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.requestCategoryImageUpload,
);

userMenuRouter.put(
  "/items/image",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.requestItemImageUpload,
);

userMenuRouter.post(
  "/imports",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
  }),
  menuController.importMenuCsv,
);

userMenuRouter.get(
  "/branches/:branchId/tree",
  accessMiddleware({
    organization: [...ORGANIZATION_MENU_READ_WRITE_PERMS],
  }),
  menuController.getBranchMenuTree,
);

userMenuRouter.post(
  "/clones",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
  }),
  menuController.cloneMenu,
);

userMenuRouter
  .route("/categories/:id")
  .patch(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.updateCategory,
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.deleteCategory,
  );
userMenuRouter.patch(
  "/categories/:id/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.updateCategoryStatus,
);

userMenuRouter
  .route("/items/:id")
  .get(
    accessMiddleware({
      organization: [...ORGANIZATION_MENU_READ_WRITE_PERMS],
      branch: [...BRANCH_MENU_READ_WRITE_PERMS],
    }),
    menuController.getItem,
  )
  .patch(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.updateItem,
  )
  .delete(
    accessMiddleware({
      organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
      branch: [UserPermissions.BRANCH_MENU_WRITE],
    }),
    menuController.deleteItem,
  );
userMenuRouter.patch(
  "/items/:id/status",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.updateItemStatus,
);

export { userMenuRouter };
