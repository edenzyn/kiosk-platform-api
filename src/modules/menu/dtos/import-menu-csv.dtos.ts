import type { DietaryTypeEnum } from "../../../shared/enums/menu/dietary-type.enum";

/** One CSV row, already parsed into camelCase fields by the client. */
export interface ImportMenuCsvRowDto {
  categoryName: string;
  itemName: string;
  description?: string | null;
  price: number;
  dietaryType: DietaryTypeEnum;
  calories?: number | null;
  hasAlcohol?: boolean;
  isSpicy?: boolean;
  takeawayChargeEnabled?: boolean;
  takeawayChargeAmount?: number | null;
  isFeatured?: boolean;
  isListed?: boolean;
}

export interface ImportMenuCsvBodyDto {
  rows: ImportMenuCsvRowDto[];
}

export interface SkippedMenuCsvItemDto {
  categoryName: string;
  itemName: string;
  reason: string;
}

export interface ImportMenuCsvResponseDto {
  /** Categories that did not exist yet and were created unlisted. */
  categoriesCreated: number;
  /** Categories the rows were added to that already existed. */
  categoriesMatched: number;
  itemsCreated: number;
  skippedItems: SkippedMenuCsvItemDto[];
}
