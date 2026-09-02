import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import type { OrganizationEntity } from "../schemas/organization.schema";

export interface GetOrganizationsRequestDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}

export interface GetOrganizationsResponseDto {
  organizations: OrganizationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
