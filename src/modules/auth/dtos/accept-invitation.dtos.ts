import type { UserEntity } from "../../user/schemas/user.schema";
import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { UserScope } from "../../user/dtos/check-auth.dtos";

export interface AcceptInvitationRequestDto {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInvitationResponseDto {
  user: Omit<UserEntity, "password">;
  permissions: UserPermissions[];
  availableScopes: UserScope[];
}
