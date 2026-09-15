import type { MenuCategoryWithImageUrl } from "../menu.types";

export interface CreateMenuCategoryBodyDto {
  name: string;
  description?: string | null;
  image?: string | null;
  isListed?: boolean;
  displayOrder?: number;
}

export interface CreateMenuCategoryRequestDto
  extends CreateMenuCategoryBodyDto {
  organizationId: string;
  branchId: string;
  createdBy: string;
}

export interface CreateMenuCategoryResponseDto {
  category: MenuCategoryWithImageUrl;
}
