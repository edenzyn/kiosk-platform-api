import type { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";
import type { ItemModifierSelectionTypeEnum } from "../../../shared/enums/menu/item-modifier-selection-type.enum";
import type { MenuItemWithImageUrl } from "../menu.types";

export interface CreateItemModifierOptionBodyDto {
  name: string;
  price: number;
  isDefault?: boolean;
  displayOrder: number;
}

export interface CreateItemModifierBodyDto {
  name: string;
  selectionType: ItemModifierSelectionTypeEnum;
  minSelection: number;
  maxSelection: number;
  displayOrder: number;
  options: CreateItemModifierOptionBodyDto[];
}

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
  image: string;
  modifiers?: CreateItemModifierBodyDto[];
}

export interface CreateMenuItemRequestDto extends Omit<
  CreateMenuItemBodyDto,
  "price" | "takeawayChargeAmount" | "calories" | "modifiers"
> {
  organizationId: string;
  branchId: string;
  price: string;
  takeawayChargeAmount?: string | null;
  calories?: string | null;
  createdBy: string;
  modifiers: CreateItemModifierBodyDto[];
}

export interface CreateMenuItemResponseDto {
  item: MenuItemWithImageUrl;
}
