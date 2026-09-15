import { FILE_UPLOAD_CONFIG } from "../../shared/constants/file-upload.constants";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { FileService } from "../file/file.service";
import type { MarketRepository } from "../market/market.repository";
import type { UpdateItemModifierBodyDto } from "./dtos/update-menu-item.dtos";
import type { MenuRepository } from "./menu.repository";
import type {
  CreateMenuCategoryServiceInput,
  CreateMenuCategoryServiceResult,
  CreateMenuItemServiceInput,
  CreateMenuItemServiceResult,
  GetMenuCategoriesServiceInput,
  GetMenuCategoriesServiceResult,
  GetMenuItemServiceInput,
  GetMenuItemServiceResult,
  GetMenuItemsServiceInput,
  GetMenuItemsServiceResult,
  ItemModifierWithOptions,
  RequestMenuImageUploadServiceInput,
  RequestMenuImageUploadServiceResult,
  UpdateMenuCategoryServiceInput,
  UpdateMenuCategoryServiceResult,
  UpdateMenuCategoryStatusServiceInput,
  UpdateMenuCategoryStatusServiceResult,
  UpdateMenuItemServiceInput,
  UpdateMenuItemServiceResult,
  UpdateMenuItemStatusServiceInput,
  UpdateMenuItemStatusServiceResult,
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

    await this.fileService.finalizeMenuImage({
      type: MenuImageTypeEnum.CATEGORY,
      image: data.image,
      maxSizeBytes: FILE_UPLOAD_CONFIG.MENU_IMAGE.maxSizeBytes,
    });

    const category = await this.menuRepository.createCategory({
      data: {
        organizationId: effectiveTenant.organizationId,
        branchId: effectiveTenant.branchId,
        name: data.name,
        description: data.description ?? null,
        image: data.image,
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

  async updateCategory(
    input: UpdateMenuCategoryServiceInput,
  ): Promise<UpdateMenuCategoryServiceResult> {
    const { data, user, effectiveTenant } = input;
    const existing = await this.findCategoryOrThrow(data.id, effectiveTenant);

    const { image, staleImage } = await this.resolveImageChange(
      MenuImageTypeEnum.CATEGORY,
      existing.image,
      data.image,
    );

    const category = await this.menuRepository.updateCategory({
      id: existing.id,
      data: {
        name: data.name,
        description: data.description ?? null,
        image,
        isListed: data.isListed,
        displayOrder: data.displayOrder,
        updatedBy: user.id,
      },
    });

    if (staleImage) {
      await this.fileService.deleteMenuImage({
        type: MenuImageTypeEnum.CATEGORY,
        image: staleImage,
      });
    }

    return this.withImageUrl(MenuImageTypeEnum.CATEGORY, category);
  }

  async updateCategoryStatus(
    input: UpdateMenuCategoryStatusServiceInput,
  ): Promise<UpdateMenuCategoryStatusServiceResult> {
    const { data, user, effectiveTenant } = input;
    const existing = await this.findCategoryOrThrow(data.id, effectiveTenant);

    const category = await this.menuRepository.updateCategory({
      id: existing.id,
      data: { isListed: data.isListed, updatedBy: user.id },
    });

    return this.withImageUrl(MenuImageTypeEnum.CATEGORY, category);
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

    await this.fileService.finalizeMenuImage({
      type: MenuImageTypeEnum.ITEM,
      image: data.image,
      maxSizeBytes: FILE_UPLOAD_CONFIG.MENU_IMAGE.maxSizeBytes,
    });

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
        image: data.image,
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

  async getItem(
    input: GetMenuItemServiceInput,
  ): Promise<GetMenuItemServiceResult> {
    const item = await this.findItemOrThrow(input.id, input.effectiveTenant);
    const modifiers = await this.menuRepository.findItemModifiers({
      menuItemId: item.id,
    });

    return {
      ...(await this.withImageUrl(MenuImageTypeEnum.ITEM, item)),
      modifiers,
    };
  }

  async updateItem(
    input: UpdateMenuItemServiceInput,
  ): Promise<UpdateMenuItemServiceResult> {
    const { data, user, effectiveTenant } = input;
    const existing = await this.findItemOrThrow(data.id, effectiveTenant);

    const existingModifiers = await this.menuRepository.findItemModifiers({
      menuItemId: existing.id,
    });
    if (data.modifiers) {
      this.assertModifierIdsBelongToItem(data.modifiers, existingModifiers);
    }

    const { image, staleImage } = await this.resolveImageChange(
      MenuImageTypeEnum.ITEM,
      existing.image,
      data.image,
    );

    const item = await this.menuRepository.updateItem({
      id: existing.id,
      data: {
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
        image,
        updatedBy: user.id,
      },
      modifiers: data.modifiers,
      existingModifiers,
    });

    if (staleImage) {
      await this.fileService.deleteMenuImage({
        type: MenuImageTypeEnum.ITEM,
        image: staleImage,
      });
    }

    return this.withImageUrl(MenuImageTypeEnum.ITEM, item);
  }

  async updateItemStatus(
    input: UpdateMenuItemStatusServiceInput,
  ): Promise<UpdateMenuItemStatusServiceResult> {
    const { data, user, effectiveTenant } = input;
    const existing = await this.findItemOrThrow(data.id, effectiveTenant);

    const item = await this.menuRepository.updateItemStatus({
      id: existing.id,
      isListed: data.isListed,
      updatedBy: user.id,
    });

    return this.withImageUrl(MenuImageTypeEnum.ITEM, item);
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

  private requireBranchId(effectiveTenant: EffectiveTenant): string {
    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to manage the menu", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }
    return effectiveTenant.branchId;
  }

  private async findCategoryOrThrow(
    id: string,
    effectiveTenant: EffectiveTenant,
  ): Promise<MenuCategoryEntity> {
    const category = await this.menuRepository.findOneCategory({
      id,
      organizationId: effectiveTenant.organizationId,
      branchId: this.requireBranchId(effectiveTenant),
    });

    if (!category) {
      throw new AppError("Category not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }
    return category;
  }

  private async findItemOrThrow(
    id: string,
    effectiveTenant: EffectiveTenant,
  ): Promise<MenuItemEntity> {
    const item = await this.menuRepository.findOneItem({
      id,
      organizationId: effectiveTenant.organizationId,
      branchId: this.requireBranchId(effectiveTenant),
    });

    if (!item) {
      throw new AppError("Item not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }
    return item;
  }

  /**
   * Works out what to store for an edited image: `undefined` keeps the current
   * image, and a new key is finalized. The replaced image is returned so it can
   * be deleted once the record is saved.
   */
  private async resolveImageChange(
    type: MenuImageTypeEnum,
    currentImage: string | null,
    nextImage: string | undefined,
  ): Promise<{ image: string | undefined; staleImage: string | null }> {
    if (nextImage === undefined || nextImage === currentImage) {
      return { image: undefined, staleImage: null };
    }

    await this.fileService.finalizeMenuImage({
      type,
      image: nextImage,
      maxSizeBytes: FILE_UPLOAD_CONFIG.MENU_IMAGE.maxSizeBytes,
    });

    return { image: nextImage, staleImage: currentImage };
  }

  /** Rejects ids that don't belong to this item, so edits can't touch other items' modifiers. */
  private assertModifierIdsBelongToItem(
    modifiers: UpdateItemModifierBodyDto[],
    existingModifiers: ItemModifierWithOptions[],
  ): void {
    const invalid = modifiers.some((modifier) => {
      if (!modifier.id) {
        return modifier.options.some((option) => option.id);
      }
      const existing = existingModifiers.find((m) => m.id === modifier.id);
      if (!existing) return true;
      return modifier.options.some(
        (option) =>
          option.id && !existing.options.some((o) => o.id === option.id),
      );
    });

    if (invalid) {
      throw new AppError("Modifier or option does not belong to this item", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
  }
}
