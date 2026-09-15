import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreateMenuCategoryBodyDto } from "./dtos/create-menu-category.dtos";
import type { CreateMenuItemBodyDto } from "./dtos/create-menu-item.dtos";
import { MenuValidator } from "./menu.validator";
import type { MenuService } from "./menu.service";

export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ========================================
  // ? MENU CATEGORY APIS
  // ========================================
  createCategory = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.createCategory.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const category = await this.menuService.createCategory({
      data: data as CreateMenuCategoryBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.CREATED).json({ category });
  };

  getCategories = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await MenuValidator.getCategoriesQuery.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const result = await this.menuService.getCategories({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? MENU ITEM APIS
  // ========================================
  createItem = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.createItem.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const item = await this.menuService.createItem({
      data: data as CreateMenuItemBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.CREATED).json({ item });
  };

  getItems = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await MenuValidator.getItemsQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.menuService.getItems({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
