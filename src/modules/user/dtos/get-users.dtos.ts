import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";

export interface UserResponseDto {
  id: string;
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  email: string;
  mobile: string | null;
  userType: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string | null;
  } | null;
  topRole?: {
    id: string;
    name: string;
    description: string | null;
    rank: number;
    isSystem: boolean;
  } | null;
}

export interface GetUsersRequestDto {
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}

export interface GetUsersResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
