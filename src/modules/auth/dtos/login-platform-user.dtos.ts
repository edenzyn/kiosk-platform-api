import type { UserEntity } from "../../user/schemas/user.schema";
import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";

export interface LoginPlatformUserRequestDto {
  email: string;
  password: string;
}

export interface LoginPlatformUserResponseDto {
  user: Omit<UserEntity, "password">;
  permissions: UserPermissions[];
}
