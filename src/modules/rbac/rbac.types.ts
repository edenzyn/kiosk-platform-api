import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionStatusEnum } from "../../shared/enums/rbac/permission-status.enum";

export interface CreateRoleDto {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  createdBy: string;
}

export interface CreatePermissionDto {
  key: string;
  organizationId?: string | null;
  branchId?: string | null;
  status?: PermissionStatusEnum;
  createdBy: string;
}

export interface CreatePermissionMapperDto {
  entityType: PermissionEntityType;
  entityId: string;
  permissionId: string;
  createdBy: string;
}

export interface CreateUserRoleMapperDto {
  userId: string;
  roleId: string;
  createdBy: string;
}
