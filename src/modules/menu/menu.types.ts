import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { DietaryTypeEnum } from "../../shared/enums/menu/dietary-type.enum";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";
import type { MenuItemSortByEnum } from "../../shared/enums/menu/menu-item-sort-by.enum";
import type { CreateMenuCategoryRequestDto } from "./dtos/create-menu-category.dtos";
import type {
  CreateItemModifierBodyDto,
  CreateMenuItemRequestDto,
} from "./dtos/create-menu-item.dtos";
import type {
  UpdateMenuCategoryBodyDto,
  UpdateMenuCategoryRequestDto,
} from "./dtos/update-menu-category.dtos";
import type { UpdateMenuCategoryStatusBodyDto } from "./dtos/update-menu-category-status.dtos";
import type {
  ImportMenuCsvBodyDto,
  ImportMenuCsvResponseDto,
  ImportMenuCsvRowDto,
} from "./dtos/import-menu-csv.dtos";
import type {
  UpdateItemModifierBodyDto,
  UpdateMenuItemBodyDto,
  UpdateMenuItemRequestDto,
} from "./dtos/update-menu-item.dtos";
import type { UpdateMenuItemStatusBodyDto } from "./dtos/update-menu-item-status.dtos";
import type { ItemModifierOptionEntity } from "./schemas/item-modifier-option.schema";
import type { ItemModifierEntity } from "./schemas/item-modifier.schema";
import type { MenuCategoryEntity } from "./schemas/menu-category.schema";
import type { MenuItemEntity } from "./schemas/menu-item.schema";

export interface MenuCategoryWithImageUrl extends MenuCategoryEntity {
  imageUrl: string | null;
}

export interface MenuCategoryWithItemCount extends MenuCategoryWithImageUrl {
  itemCount: number;
}

export type MenuCategoryRowWithItemCount = MenuCategoryEntity & {
  itemCount: number;
};

export interface MenuItemWithImageUrl extends MenuItemEntity {
  imageUrl: string | null;
}

export interface ItemModifierWithOptions extends ItemModifierEntity {
  options: ItemModifierOptionEntity[];
}

/** An item with its active modifier groups and options, in display order. */
export interface MenuItemDetails extends MenuItemWithImageUrl {
  modifiers: ItemModifierWithOptions[];
}

// ========================================
// ? MENU CATEGORY SERVICE INPUTS & RESULTS
// ========================================
export interface CreateMenuCategoryServiceInput {
  data: {
    name: string;
    description?: string | null;
    image: string;
    isListed?: boolean;
    displayOrder?: number;
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuCategoryServiceResult = MenuCategoryWithImageUrl;

export interface UpdateMenuCategoryServiceInput {
  data: UpdateMenuCategoryBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type UpdateMenuCategoryServiceResult = MenuCategoryWithImageUrl;

export interface UpdateMenuCategoryStatusServiceInput {
  data: UpdateMenuCategoryStatusBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type UpdateMenuCategoryStatusServiceResult = MenuCategoryWithImageUrl;

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetMenuCategoriesServiceInput {
  effectiveTenant: EffectiveTenant;
  filters?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    isListed?: boolean;
    search?: string;
  };
}

export interface GetMenuCategoriesServiceResult extends PaginationResult {
  categories: MenuCategoryWithItemCount[];
}

// ========================================
// ? MENU ITEM SERVICE INPUTS & RESULTS
// ========================================
export interface CreateMenuItemServiceInput {
  data: {
    categoryId: string;
    name: string;
    description?: string | null;
    price: number;
    code?: string | null;
    takeawayChargeEnabled?: boolean;
    takeawayChargeAmount?: number | null;
    isFeatured?: boolean;
    isListed?: boolean;
    calories?: number | null;
    dietaryType?: DietaryTypeEnum;
    hasAlcohol?: boolean;
    isSpicy?: boolean;
    displayOrder?: number;
    image: string;
    modifiers?: CreateItemModifierBodyDto[];
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuItemServiceResult = MenuItemWithImageUrl;

export interface GetMenuItemServiceInput {
  id: string;
  effectiveTenant: EffectiveTenant;
}
export type GetMenuItemServiceResult = MenuItemDetails;

export interface UpdateMenuItemServiceInput {
  data: UpdateMenuItemBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type UpdateMenuItemServiceResult = MenuItemWithImageUrl;

export interface UpdateMenuItemStatusServiceInput {
  data: UpdateMenuItemStatusBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type UpdateMenuItemStatusServiceResult = MenuItemWithImageUrl;

export interface RequestMenuImageUploadServiceInput {
  type: MenuImageTypeEnum;
  contentType: string;
  fileSize: number;
}

export interface RequestMenuImageUploadServiceResult {
  image: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface GetMenuItemsServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: {
    page?: number;
    limit?: number;
    categoryId: string;
    isListed?: boolean;
    dietaryType?: number;
    search?: string;
    sortBy?: MenuItemSortByEnum;
    sortOrder?: SortingOrderEnum;
  };
}

export interface GetMenuItemsServiceResult extends PaginationResult {
  items: MenuItemWithImageUrl[];
  currencyCode: string;
}

// ========================================
// ? MENU CATEGORY REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneMenuCategoryRepoInput {
  id?: string;
  organizationId?: string;
  branchId?: string;
}
export type FindOneMenuCategoryRepoResult = MenuCategoryEntity | null;

export interface FindMenuCategoriesRepoInput {
  page: number;
  limit: number;
  organizationId: string;
  branchId: string;
  isActive?: boolean;
  isListed?: boolean;
  search?: string;
}
export interface FindMenuCategoriesRepoResult {
  categories: MenuCategoryRowWithItemCount[];
  total: number;
}

export interface CreateMenuCategoryRepoInput {
  data: CreateMenuCategoryRequestDto;
}
export type CreateMenuCategoryRepoResult = MenuCategoryEntity;

export interface UpdateMenuCategoryRepoInput {
  id: string;
  data: Partial<UpdateMenuCategoryRequestDto> & { updatedBy: string };
}
export type UpdateMenuCategoryRepoResult = MenuCategoryEntity;

// ========================================
// ? MENU ITEM REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneMenuItemRepoInput {
  id?: string;
  organizationId?: string;
  branchId?: string;
}
export type FindOneMenuItemRepoResult = MenuItemEntity | null;

export interface FindMenuItemsRepoInput {
  page: number;
  limit: number;
  organizationId: string;
  branchId: string;
  categoryId: string;
  isListed?: boolean;
  dietaryType?: number;
  search?: string;
  sortBy?: MenuItemSortByEnum;
  sortOrder?: SortingOrderEnum;
}
export interface FindMenuItemsRepoResult {
  items: MenuItemEntity[];
  total: number;
}

export interface CreateMenuItemRepoInput {
  data: CreateMenuItemRequestDto;
}
export type CreateMenuItemRepoResult = MenuItemEntity;

export interface FindItemModifiersRepoInput {
  menuItemId: string;
}
export type FindItemModifiersRepoResult = ItemModifierWithOptions[];

export interface UpdateMenuItemRepoInput {
  id: string;
  data: UpdateMenuItemRequestDto;
  /** Complete desired modifier list; omit to leave modifiers untouched. */
  modifiers?: UpdateItemModifierBodyDto[];
  /** Current active modifiers, used to work out what to update or deactivate. */
  existingModifiers: ItemModifierWithOptions[];
}
export type UpdateMenuItemRepoResult = MenuItemEntity;

export interface UpdateMenuItemStatusRepoInput {
  id: string;
  isListed: boolean;
  updatedBy: string;
}
export type UpdateMenuItemStatusRepoResult = MenuItemEntity;

// ========================================
// ? MENU IMPORT INPUTS & RESULTS
// ========================================
export interface ImportMenuCsvServiceInput {
  data: ImportMenuCsvBodyDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type ImportMenuCsvServiceResult = ImportMenuCsvResponseDto;

export interface FindCategoriesByNamesRepoInput {
  organizationId: string;
  branchId: string;
  /** Lowercased names; compared against `lower(name)`. */
  names: string[];
}
export type FindCategoriesByNamesRepoResult = MenuCategoryEntity[];

export interface FindItemNamesByCategoryIdsRepoInput {
  categoryIds: string[];
}
export interface FindItemNamesByCategoryIdsRepoResult {
  categoryId: string;
  name: string;
}

export interface ImportMenuCsvRepoInput {
  organizationId: string;
  branchId: string;
  userId: string;
  /** Categories to create first; items reference them by `categoryKey`. */
  newCategories: { categoryKey: string; name: string; displayOrder: number }[];
  /** Ids of categories that already existed, keyed the same way. */
  existingCategoryIds: Map<string, string>;
  items: (ImportMenuCsvRowDto & {
    categoryKey: string;
    displayOrder: number;
  })[];
}
export interface ImportMenuCsvRepoResult {
  categoriesCreated: number;
  itemsCreated: number;
}
