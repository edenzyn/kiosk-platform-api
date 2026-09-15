import type { MenuCategoryEntity } from "../schemas/menu-category.schema";

export interface GetMenuCategoriesQueryDto {
  isActive?: boolean;
  isListed?: boolean;
  search?: string;
}

export interface MenuCategoryWithItemCountDto extends MenuCategoryEntity {
  itemCount: number;
}

export interface GetMenuCategoriesResponseDto {
  categories: MenuCategoryWithItemCountDto[];
}
