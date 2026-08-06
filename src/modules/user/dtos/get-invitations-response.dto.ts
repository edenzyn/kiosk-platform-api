import type { UserInvitationEntity } from "../schemas/user-invitations.schema";

export interface GetInvitationsResponseDto {
  invitations: UserInvitationEntity[];
}
