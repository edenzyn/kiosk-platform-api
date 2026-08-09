import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";

export interface GetUsersRequestDto {
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
