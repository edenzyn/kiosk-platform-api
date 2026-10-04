import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import type { BusinessDayDto } from "./business-day.dtos";

export interface GetBusinessDaysQueryDto {
  page?: number;
  limit?: number;
  /** YYYY-MM-DD, inclusive. */
  fromDate?: string;
  /** YYYY-MM-DD, inclusive. */
  toDate?: string;
  sortOrder?: SortingOrderEnum;
}

export interface GetBusinessDaysResponseDto {
  businessDays: BusinessDayDto[];
  /** Branch time zone, for showing the open and close times. */
  timezone: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
