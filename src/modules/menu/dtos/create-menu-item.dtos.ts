import type { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";
import type { MenuItemEntity } from "../schemas/menu-item.schema";

export interface CreateMenuItemBodyDto {
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  code?: string | null;
  takeawayChargeEnabled?: boolean;
  takeawayChargeAmount?: number | null;
  isFeatured?: boolean;
  isListed?: boolean;
  calories?: number | null;
  dietaryType?: DietaryTypeEnum;
  hasAlcohol?: boolean;
  isSpicy?: boolean;
  displayOrder?: number;
}

export interface CreateMenuItemRequestDto
  extends Omit<
    CreateMenuItemBodyDto,
    "price" | "takeawayChargeAmount" | "calories"
  > {
  organizationId: string;
  branchId: string;
  price: string;
  takeawayChargeAmount?: string | null;
  calories?: string | null;
  createdBy: string;
}

export interface CreateMenuItemResponseDto {
  item: MenuItemEntity;
}
