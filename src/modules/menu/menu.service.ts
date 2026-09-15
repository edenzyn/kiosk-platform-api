import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { MarketRepository } from "../market/market.repository";
import type { MenuRepository } from "./menu.repository";
import type {
  CreateMenuCategoryServiceInput,
  CreateMenuCategoryServiceResult,
  CreateMenuItemServiceInput,
  CreateMenuItemServiceResult,
  GetMenuCategoriesServiceInput,
  GetMenuCategoriesServiceResult,
  GetMenuItemsServiceInput,
  GetMenuItemsServiceResult,
} from "./menu.types";

export class MenuService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly marketRepository: MarketRepository,
  ) {}

  // ========================================
  // ? MENU CATEGORY SERVICES
  // ========================================
  async createCategory(
    input: CreateMenuCategoryServiceInput,
  ): Promise<CreateMenuCategoryServiceResult> {
    const { data, user, effectiveTenant } = input;

    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to create a category", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const category = await this.menuRepository.createCategory({
      data: {
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        name: data.name,
        description: data.description ?? null,
        banner: data.banner ?? null,
        isListed: data.isListed,
        displayOrder: data.displayOrder,
        createdBy: user.id,
      },
    });

    return category;
  }

  async getCategories(
    input: GetMenuCategoriesServiceInput,
  ): Promise<GetMenuCategoriesServiceResult> {
    const { effectiveTenant, filters = {} } = input;

    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to view categories", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const { categories } = await this.menuRepository.findCategories({
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId,
      isActive: filters.isActive,
      isListed: filters.isListed,
      search: filters.search,
    });

    return { categories };
  }

  // ========================================
  // ? MENU ITEM SERVICES
  // ========================================
  async createItem(
    input: CreateMenuItemServiceInput,
  ): Promise<CreateMenuItemServiceResult> {
    const { data, user, effectiveTenant } = input;

    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to create an item", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const category = await this.menuRepository.findOneCategory({
      id: data.categoryId,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId,
    });

    if (!category) {
      throw new AppError("Category not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const item = await this.menuRepository.createItem({
      data: {
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        price: String(data.price),
        code: data.code ?? null,
        takeawayChargeEnabled: data.takeawayChargeEnabled,
        takeawayChargeAmount:
          data.takeawayChargeAmount != null
            ? String(data.takeawayChargeAmount)
            : null,
        isFeatured: data.isFeatured,
        isListed: data.isListed,
        calories: data.calories != null ? String(data.calories) : null,
        dietaryType: data.dietaryType,
        hasAlcohol: data.hasAlcohol,
        isSpicy: data.isSpicy,
        displayOrder: data.displayOrder,
        createdBy: user.id,
      },
    });

    return item;
  }

  async getItems(
    input: GetMenuItemsServiceInput,
  ): Promise<GetMenuItemsServiceResult> {
    const { effectiveTenant, filters } = input;

    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to view items", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const [{ items }, market] = await Promise.all([
      this.menuRepository.findItems({
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        categoryId: filters.categoryId,
        isListed: filters.isListed,
        search: filters.search,
      }),
      this.marketRepository.findMarketByBranch({
        branchId: effectiveTenant.branchId,
      }),
    ]);

    if (!market) {
      throw new AppError("No market is configured for this branch", {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    return { items, currencyCode: market.currencyCode };
  }
}
