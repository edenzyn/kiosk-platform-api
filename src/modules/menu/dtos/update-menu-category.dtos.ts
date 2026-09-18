import type { MenuCategoryWithImageUrl } from "../menu.types";

export interface UpdateMenuCategoryBodyDto {
  id: string;
  name: string;
  description?: string | null;
  /** Omit to keep the current image, or pass a new upload key to replace it. */
  image?: string;
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
