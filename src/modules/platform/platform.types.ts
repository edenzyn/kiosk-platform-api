import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { RoleEntity } from "../rbac/schemas/role.schema";
import type { UserSettingsEntity } from "../user/schemas/user-settings.schema";
import type { UserEntity } from "../user/schemas/user.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================

export interface CheckPlatformUserAuthServiceInput {
  tokenUser: UserTokenDto;
}

export interface CheckPlatformUserAuthServiceResult {
  user: Omit<UserEntity, "password">;
  permissions: UserPermissions[];
  topRole?: Pick<RoleEntity, "name" | "description" | "rank" | "isSystem"> | null;
  settings: UserSettingsEntity;
}
