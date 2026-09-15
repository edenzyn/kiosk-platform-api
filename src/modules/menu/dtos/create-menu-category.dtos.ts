import type { MenuCategoryEntity } from "../schemas/menu-category.schema";

export interface CreateMenuCategoryBodyDto {
  name: string;
  description?: string | null;
  banner?: string | null;
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
  category: MenuCategoryEntity;
}
