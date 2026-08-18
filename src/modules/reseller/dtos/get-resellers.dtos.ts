import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";

export interface ResellerResponseDto {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface GetResellersRequestDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}

export interface GetResellersResponseDto {
  resellers: ResellerResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
