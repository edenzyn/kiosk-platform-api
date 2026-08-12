import type { UserInvitationEntity } from "../schemas/user-invitations.schema";
import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";

export interface GetInvitationsRequestDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}

export interface GetInvitationsResponseDto {
  invitations: UserInvitationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
