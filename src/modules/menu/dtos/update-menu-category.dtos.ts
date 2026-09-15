import type { MenuCategoryWithImageUrl } from "../menu.types";

export interface UpdateMenuCategoryBodyDto {
  id: string;
  name: string;
  description?: string | null;
  /** Omit to keep the current image, `null` to remove it, or a new upload key. */
  image?: string | null;
  isListed?: boolean;
  displayOrder?: number;
}

export interface UpdateMenuCategoryRequestDto {
  name: string;
  description: string | null;
  image?: string | null;
  isListed?: boolean;
  displayOrder?: number;
  updatedBy: string;
}

export interface UpdateMenuCategoryResponseDto {
  category: MenuCategoryWithImageUrl;
}
