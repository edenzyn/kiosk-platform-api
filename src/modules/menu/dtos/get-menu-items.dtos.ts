import type { MenuItemEntity } from "../schemas/menu-item.schema";

export interface GetMenuItemsQueryDto {
  categoryId: string;
  isListed?: boolean;
  search?: string;
}

export interface GetMenuItemsResponseDto {
  items: MenuItemEntity[];
}
