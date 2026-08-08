import type { UserInvitationEntity } from "../schemas/user-invitations.schema";

export interface GetInvitationsResponseDto {
  invitations: UserInvitationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
