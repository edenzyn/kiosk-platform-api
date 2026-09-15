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

// ========================================
// ? MENU CATEGORY SERVICE INPUTS & RESULTS
// ========================================
export interface CreateMenuCategoryServiceInput {
  data: {
    name: string;
    description?: string | null;
    image?: string | null;
    isListed?: boolean;
    displayOrder?: number;
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuCategoryServiceResult = MenuCategoryWithImageUrl;

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
    image?: string | null;
    modifiers?: CreateItemModifierBodyDto[];
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuItemServiceResult = MenuItemWithImageUrl;

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
