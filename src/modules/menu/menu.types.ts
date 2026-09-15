import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { DietaryTypeEnum } from "../../shared/enums/menu/dietary-type.enum";
import type { CreateMenuCategoryRequestDto } from "./dtos/create-menu-category.dtos";
import type { CreateMenuItemRequestDto } from "./dtos/create-menu-item.dtos";
import type { MenuCategoryEntity } from "./schemas/menu-category.schema";
import type { MenuItemEntity } from "./schemas/menu-item.schema";

export interface MenuCategoryWithItemCount extends MenuCategoryEntity {
  itemCount: number;
}

// ========================================
// ? MENU CATEGORY SERVICE INPUTS & RESULTS
// ========================================
export interface CreateMenuCategoryServiceInput {
  data: {
    name: string;
    description?: string | null;
    banner?: string | null;
    isListed?: boolean;
    displayOrder?: number;
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuCategoryServiceResult = MenuCategoryEntity;

export interface GetMenuCategoriesServiceInput {
  effectiveTenant: EffectiveTenant;
  filters?: {
    isActive?: boolean;
    isListed?: boolean;
    search?: string;
  };
}

export interface GetMenuCategoriesServiceResult {
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
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateMenuItemServiceResult = MenuItemEntity;

export interface GetMenuItemsServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: {
    categoryId: string;
    isListed?: boolean;
    search?: string;
  };
}

export interface GetMenuItemsServiceResult {
  items: MenuItemEntity[];
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
  organizationId: string;
  branchId: string;
  isActive?: boolean;
  isListed?: boolean;
  search?: string;
}
export interface FindMenuCategoriesRepoResult {
  categories: MenuCategoryWithItemCount[];
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
  organizationId: string;
  branchId: string;
  categoryId: string;
  isListed?: boolean;
  search?: string;
}
export interface FindMenuItemsRepoResult {
  items: MenuItemEntity[];
}

export interface CreateMenuItemRepoInput {
  data: CreateMenuItemRequestDto;
}
export type CreateMenuItemRepoResult = MenuItemEntity;
