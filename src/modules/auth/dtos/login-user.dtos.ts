import type { UserEntity } from "../../user/schemas/user.schema";
import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { UserScope } from "../../user/dtos/check-auth.dtos";

export interface LoginUserRequestDto {
  email: string;
  password: string;
}

export interface LoginUserResponseDto {
  user: Omit<UserEntity, "password" | "pin">;
  permissions: UserPermissions[];
  availableScopes: UserScope[];
}
