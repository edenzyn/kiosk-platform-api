import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import type { MenuItemSortByEnum } from "../../../shared/enums/menu/menu-item-sort-by.enum";
import type { MenuItemWithImageUrl } from "../menu.types";

export interface GetMenuItemsQueryDto {
  categoryId: string;
  isListed?: boolean;
  dietaryType?: number;
  search?: string;
  sortBy?: MenuItemSortByEnum;
  sortOrder?: SortingOrderEnum;
}

export interface GetMenuItemsResponseDto {
  items: MenuItemWithImageUrl[];
  currencyCode: string;
}
