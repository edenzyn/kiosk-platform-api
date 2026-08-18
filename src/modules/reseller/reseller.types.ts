import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type {
  GetResellerInvitationsRequestDto,
  GetResellerInvitationsResponseDto,
} from "./dtos/get-reseller-invitations.dtos";
import type {
  GetResellersRequestDto,
  GetResellersResponseDto,
} from "./dtos/get-resellers.dtos";
import type {
  InviteResellerRequestDto,
  InviteResellerResponseDto,
} from "./dtos/invite-reseller.dtos";
import type { UpdateResellerStatusResponseDto } from "./dtos/update-reseller-status.dtos";

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

export interface GetResellersServiceInput {
  query: GetResellersRequestDto;
}
export type GetResellersServiceResult = GetResellersResponseDto;

export interface ToggleResellerStatusServiceInput {
  resellerId: string;
  currentUser: UserTokenDto;
}
export type ToggleResellerStatusServiceResult = UpdateResellerStatusResponseDto;
