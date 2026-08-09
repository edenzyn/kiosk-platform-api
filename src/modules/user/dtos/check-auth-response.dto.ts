import type { RoleEntity } from "../../rbac/schemas/role.schema";
import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import { UserScopeTypeEnums } from "../../../shared/enums/user/user-scope-type.enum";
import type { UserEntity } from "../schemas/user.schema";

export type CheckAuthUserDto = Omit<UserEntity, "password">;

export interface UserScope {
  id: string;
  name: string;
  type: UserScopeTypeEnums;
  createdAt: Date | null;
}

export interface CheckAuthResponseDto {
  user: CheckAuthUserDto;
  permissions: UserPermissions[];
  availableScopes: UserScope[];
  topRole?: Pick<RoleEntity, "name" | "description" | "rank" | "isSystem"> | null;
}
