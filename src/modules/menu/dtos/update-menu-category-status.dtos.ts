import type { MenuCategoryWithImageUrl } from "../menu.types";

export interface UpdateMenuCategoryStatusBodyDto {
  id: string;
  isListed: boolean;
}

export interface UpdateMenuCategoryStatusResponseDto {
  category: MenuCategoryWithImageUrl;
}
