import type { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";
import type { ItemModifierSelectionTypeEnum } from "../../../shared/enums/menu/item-modifier-selection-type.enum";

export interface GetBranchMenuTreeParamsDto {
  branchId: string;
}

export interface BranchMenuTreeOptionRow {
  id: string;
  itemModifierId: string;
  name: string;
  price: string;
  isDefault: boolean;
  displayOrder: number;
}

export interface BranchMenuTreeModifierRow {
  id: string;
  name: string;
  selectionType: ItemModifierSelectionTypeEnum;
  minSelection: number;
  maxSelection: number;
  displayOrder: number;
  options: BranchMenuTreeOptionRow[];
}

export interface BranchMenuTreeItemRow {
  id: string;
  name: string;
  description: string | null;
  price: string;
  code: string | null;
  image: string | null;
  takeawayChargeEnabled: boolean;
  takeawayChargeAmount: string | null;
  isFeatured: boolean;
  calories: string | null;
  dietaryType: DietaryTypeEnum;
  hasAlcohol: boolean;
  isSpicy: boolean;
  displayOrder: number;
  modifiers: BranchMenuTreeModifierRow[];
}

export interface BranchMenuTreeCategoryRow {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  displayOrder: number;
  items: BranchMenuTreeItemRow[];
}

/** Same row, plus a short-lived URL for its stored image. */
type WithImageUrl<T> = T & { imageUrl: string | null };

export type BranchMenuTreeItemDto = Omit<
  WithImageUrl<BranchMenuTreeItemRow>,
  "modifiers"
> & { modifiers: BranchMenuTreeModifierRow[] };

export type BranchMenuTreeCategoryDto = Omit<
  WithImageUrl<BranchMenuTreeCategoryRow>,
  "items"
> & { items: BranchMenuTreeItemDto[] };

export interface GetBranchMenuTreeResponseDto {
  sourceBranch: { id: string; name: string };
  /** Currency of the branch being cloned into, for the price fields. */
  currencyCode: string;
  categories: BranchMenuTreeCategoryDto[];
}
