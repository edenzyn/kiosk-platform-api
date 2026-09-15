import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";
import type { CreateMenuCategoryBodyDto } from "./dtos/create-menu-category.dtos";
import type { CreateMenuItemBodyDto } from "./dtos/create-menu-item.dtos";
import type { UpdateMenuCategoryBodyDto } from "./dtos/update-menu-category.dtos";
import type { UpdateMenuItemBodyDto } from "./dtos/update-menu-item.dtos";
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

  updateCategory = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.updateCategory.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const category = await this.menuService.updateCategory({
      data: data as UpdateMenuCategoryBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ category });
  };

  updateCategoryStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.updateCategoryStatus.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const category = await this.menuService.updateCategoryStatus({
      data,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ category });
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

  getItem = async (req: Request, res: Response): Promise<void> => {
    const params = await MenuValidator.itemIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const item = await this.menuService.getItem({
      id: params.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ item });
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.updateItem.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const item = await this.menuService.updateItem({
      data: data as UpdateMenuItemBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ item });
  };

  updateItemStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await MenuValidator.updateItemStatus.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const item = await this.menuService.updateItemStatus({
      data,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ item });
  };

  requestItemImageUpload = (req: Request, res: Response): Promise<void> =>
    this.requestImageUpload(MenuImageTypeEnum.ITEM, req, res);

  requestCategoryImageUpload = (req: Request, res: Response): Promise<void> =>
    this.requestImageUpload(MenuImageTypeEnum.CATEGORY, req, res);

  private requestImageUpload = async (
    type: MenuImageTypeEnum,
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await MenuValidator.requestImageUpload.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.menuService.requestImageUpload({
      type,
      contentType: data.contentType,
      fileSize: data.fileSize,
    });
    res.status(HttpStatusCodes.OK).json(result);
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
