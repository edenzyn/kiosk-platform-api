/**
 * Only ids and price overrides travel from the client — every other field is
 * read from the source branch, so a caller can never inject foreign content.
 */
export interface CloneMenuOptionBodyDto {
  id: string;
  price?: number;
}

export interface CloneMenuModifierBodyDto {
  id: string;
  /** Omit to take every option of the group; an empty list drops the group. */
  options?: CloneMenuOptionBodyDto[];
}

export interface CloneMenuItemBodyDto {
  id: string;
  price?: number;
  /** Omit to take every modifier of the item. */
  modifiers?: CloneMenuModifierBodyDto[];
}

export interface CloneMenuCategoryBodyDto {
  id: string;
  items: CloneMenuItemBodyDto[];
}

export interface CloneMenuBodyDto {
  sourceBranchId: string;
  categories: CloneMenuCategoryBodyDto[];
}
