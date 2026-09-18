import type { MenuItemDetails } from "../menu.types";

export interface GetMenuItemParamsDto {
  id: string;
}

export interface GetMenuItemResponseDto {
  item: MenuItemDetails;
}
