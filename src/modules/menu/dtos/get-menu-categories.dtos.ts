import type { MenuCategoryWithItemCount } from "../menu.types";

export interface GetMenuCategoriesQueryDto {
  isActive?: boolean;
  isListed?: boolean;
  search?: string;
}

export interface GetMenuCategoriesResponseDto {
  categories: MenuCategoryWithItemCount[];
}
