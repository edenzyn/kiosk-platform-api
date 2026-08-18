import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { UserEntity } from "../../user/schemas/user.schema";

export interface AcceptResellerInvitationRequestDto {
  token: string;
  name: string;
  password: string;
}

export interface AcceptResellerInvitationResponseDto {
  user: Omit<UserEntity, "password">;
  permissions: UserPermissions[];
}
