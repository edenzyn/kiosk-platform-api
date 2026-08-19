import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { RoleEntity } from "../../rbac/schemas/role.schema";
import type { UserSettingsEntity } from "../../user/schemas/user-settings.schema";
import type { UserEntity } from "../../user/schemas/user.schema";

export type CheckPlatformAuthUserDto = Omit<UserEntity, "password">;

export interface CheckPlatformUserAuthResponseDto {
  user: CheckPlatformAuthUserDto;
  permissions: UserPermissions[];
  topRole?: Pick<RoleEntity, "name" | "description" | "rank" | "isSystem"> | null;
  settings: UserSettingsEntity;
}

export interface CheckPlatformUserAuthRequestDto {}
