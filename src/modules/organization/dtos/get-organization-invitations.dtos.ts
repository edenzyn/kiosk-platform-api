import type { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import type { UserInvitationEntity } from "../../user/schemas/user-invitations.schema";

export interface GetOrganizationInvitationsRequestDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
  status?: number;
}

export interface GetOrganizationInvitationsResponseDto {
  invitations: UserInvitationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
