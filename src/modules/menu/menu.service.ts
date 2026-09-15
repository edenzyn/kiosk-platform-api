import { FILE_UPLOAD_CONFIG } from "../../shared/constants/file-upload.constants";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { FileService } from "../file/file.service";
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
  RequestMenuImageUploadServiceInput,
  RequestMenuImageUploadServiceResult,
} from "./menu.types";
import type { MenuCategoryEntity } from "./schemas/menu-category.schema";
import type { MenuItemEntity } from "./schemas/menu-item.schema";

export class MenuService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly marketRepository: MarketRepository,
    private readonly fileService: FileService,
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

    if (data.image) {
      await this.fileService.finalizeMenuImage({
        type: MenuImageTypeEnum.CATEGORY,
        image: data.image,
        maxSizeBytes: FILE_UPLOAD_CONFIG.MENU_IMAGE.maxSizeBytes,
      });
    }

    const category = await this.menuRepository.createCategory({
      data: {
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        name: data.name,
        description: data.description ?? null,
        image: data.image ?? null,
        isListed: data.isListed,
        displayOrder: data.displayOrder,
        createdBy: user.id,
      },
    });

    return this.withImageUrl(MenuImageTypeEnum.CATEGORY, category);
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

    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const { categories, total } = await this.menuRepository.findCategories({
      page,
      limit,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId,
      isActive: filters.isActive,
      isListed: filters.isListed,
      search: filters.search,
    });

    return {
      categories: await Promise.all(
        categories.map((category) =>
          this.withImageUrl(MenuImageTypeEnum.CATEGORY, category),
        ),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    if (data.image) {
      await this.fileService.finalizeMenuImage({
        type: MenuImageTypeEnum.ITEM,
        image: data.image,
        maxSizeBytes: FILE_UPLOAD_CONFIG.MENU_IMAGE.maxSizeBytes,
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
        image: data.image ?? null,
        createdBy: user.id,
        modifiers: data.modifiers ?? [],
      },
    });

    return this.withImageUrl(MenuImageTypeEnum.ITEM, item);
  }

  async requestImageUpload(
    input: RequestMenuImageUploadServiceInput,
  ): Promise<RequestMenuImageUploadServiceResult> {
    const { type, contentType, fileSize } = input;
    const config = FILE_UPLOAD_CONFIG.MENU_IMAGE;

    if (
      !config.acceptedTypes.includes(
        contentType as (typeof config.acceptedTypes)[number],
      )
    ) {
      throw new AppError("Unsupported or missing image content type", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (fileSize > config.maxSizeBytes) {
      throw new AppError("Image is too large", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return this.fileService.createMenuImageUploadUrl({ type, contentType });
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

    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const [{ items, total }, market] = await Promise.all([
      this.menuRepository.findItems({
        page,
        limit,
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        categoryId: filters.categoryId,
        isListed: filters.isListed,
        dietaryType: filters.dietaryType,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
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

    return {
      items: await Promise.all(
        items.map((item) => this.withImageUrl(MenuImageTypeEnum.ITEM, item)),
      ),
      currencyCode: market.currencyCode,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // ? HELPERS
  // ========================================
  private async withImageUrl<T extends MenuItemEntity | MenuCategoryEntity>(
    type: MenuImageTypeEnum,
    record: T,
  ): Promise<T & { imageUrl: string | null }> {
    if (!record.image) return { ...record, imageUrl: null };

    const { imageUrl } = await this.fileService.generateMenuImageUrl({
      type,
      image: record.image,
    });
    return { ...record, imageUrl };
  }
}
