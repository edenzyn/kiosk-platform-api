import { Router } from "express";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import {
  BRANCH_MENU_READ_WRITE_PERMS,
  ORGANIZATION_MENU_READ_WRITE_PERMS,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { MenuController } from "./menu.controller";

const menuRouter = Router();
const menuController = container.resolve<MenuController>("menuController");

menuRouter
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

menuRouter
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

menuRouter.put(
  "/categories/image",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.requestCategoryImageUpload,
);

menuRouter.put(
  "/items/image",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_MENU_WRITE],
    branch: [UserPermissions.BRANCH_MENU_WRITE],
  }),
  menuController.requestItemImageUpload,
);

export { menuRouter };
