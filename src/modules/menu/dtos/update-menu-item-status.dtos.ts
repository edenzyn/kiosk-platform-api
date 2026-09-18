import type { MenuItemWithImageUrl } from "../menu.types";

export interface UpdateMenuItemStatusBodyDto {
  id: string;
  isListed: boolean;
}

export interface UpdateMenuItemStatusResponseDto {
  item: MenuItemWithImageUrl;
}
