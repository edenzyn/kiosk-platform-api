import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type {
  GetResellerInvitationsRequestDto,
  GetResellerInvitationsResponseDto,
} from "./dtos/get-reseller-invitations.dtos";
import type {
  InviteResellerRequestDto,
  InviteResellerResponseDto,
} from "./dtos/invite-reseller.dtos";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface InviteResellerServiceInput {
  dto: InviteResellerRequestDto;
  currentUser: UserTokenDto;
}
export type InviteResellerServiceResult = InviteResellerResponseDto;

export interface GetResellerInvitationsServiceInput {
  query: GetResellerInvitationsRequestDto;
}
export type GetResellerInvitationsServiceResult =
  GetResellerInvitationsResponseDto;
