import type { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";
import type { MenuItemWithImageUrl } from "../menu.types";
import type {
  CreateItemModifierBodyDto,
  CreateItemModifierOptionBodyDto,
} from "./create-menu-item.dtos";

/** Options/groups sent with an `id` are updated; ones without are created. */
export interface UpdateItemModifierOptionBodyDto extends CreateItemModifierOptionBodyDto {
  id?: string;
}

export interface UpdateItemModifierBodyDto extends Omit<
  CreateItemModifierBodyDto,
  "options"
> {
  id?: string;
  options: UpdateItemModifierOptionBodyDto[];
}

export interface UpdateMenuItemBodyDto {
  id: string;
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
  /** Omit to keep the current image, `null` to remove it, or a new upload key. */
  image?: string | null;
  /**
   * The item's complete modifier list. Groups/options missing from it are
   * deactivated rather than deleted, so past orders can still reference them.
   */
  modifiers?: UpdateItemModifierBodyDto[];
}

export interface UpdateMenuItemRequestDto extends Omit<
  UpdateMenuItemBodyDto,
  "id" | "price" | "takeawayChargeAmount" | "calories" | "modifiers"
> {
  price: string;
  takeawayChargeAmount: string | null;
  calories: string | null;
  updatedBy: string;
}

export interface UpdateMenuItemResponseDto {
  item: MenuItemWithImageUrl;
}
