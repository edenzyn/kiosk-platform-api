import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import type { RoleEntity } from "./schemas/role.schema";
import type { PermissionEntity } from "./schemas/permission.schema";
import type { PermissionMapperEntity } from "./schemas/permission-mapper.schema";
import type { UserRoleMapperEntity } from "./schemas/user-roles-mapper.schema";

export interface CreateRoleRequestDto {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  createdBy: string;
}

export interface CreatePermissionRequestDto {
  key: string;
  description?: string | null;
  createdBy: string;
}

export interface CreatePermissionMapperRequestDto {
  entityType: PermissionEntityType;
  entityId: string;
  permissionId: string;
  organizationId?: string | null;
  branchId?: string | null;
  createdBy: string;
}

export interface CreateUserRoleMapperRequestDto {
  userId: string;
  roleId: string;
  createdBy: string;
}

export interface GetUserPermissionsRequestDto {
  userId: string;
  organizationId?: string | null;
  branchId?: string | null;
}

export interface CreateRoleResponseDto {
  role: RoleEntity;
}

export interface CreatePermissionResponseDto {
  permission: PermissionEntity;
}

export interface CreatePermissionMapperResponseDto {
  mapper: PermissionMapperEntity;
}

export interface CreateUserRoleMapperResponseDto {
  mapper: UserRoleMapperEntity;
}
