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
}

export interface ImportMenuCsvBodyDto {
  rows: ImportMenuCsvRowDto[];
}
