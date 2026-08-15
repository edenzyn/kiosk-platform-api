import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { UserEntity } from "../user/schemas/user.schema";
import type {
  AssignPermissionRequestDto,
  AssignPermissionResponseDto,
} from "./dtos/permission/assign-permission.dtos";
import type {
  GetPermissionsByTenantRequestDto,
  GetPermissionsByTenantResponseDto,
  PermissionEntityWithAssigned,
} from "./dtos/permission/get-permissions-by-tenant.dtos";
import type { GetUserPermissionsRequestDto } from "./dtos/permission/get-user-permissions.dtos";
import type {
  RemovePermissionRequestDto,
  RemovePermissionResponseDto,
} from "./dtos/permission/remove-permission.dtos";
import type { CreateRoleRequestDto } from "./dtos/role/create-role.dtos";
import type {
  GetRolesRequestDto,
  GetRolesResponseDto,
} from "./dtos/role/get-roles.dtos";
import type { UpdateRoleRequestDto } from "./dtos/role/update-role.dtos";
import type { PermissionMapperEntity } from "./schemas/permission-mapper.schema";
import type { PermissionEntity } from "./schemas/permission.schema";
import type { RoleEntity } from "./schemas/role.schema";
import type { UserRoleMapperEntity } from "./schemas/user-roles-mapper.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface CreateRoleServiceInput {
  data: Omit<CreateRoleRequestDto, "createdBy">;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type CreateRoleServiceResult = RoleEntity;

export interface UpdateRoleServiceInput {
  data: UpdateRoleRequestDto;
  user: UserTokenDto;
}
export type UpdateRoleServiceResult = RoleEntity;

export interface AssignPermissionServiceInput {
  data: Omit<AssignPermissionRequestDto, "createdBy">;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type AssignPermissionServiceResult = AssignPermissionResponseDto;

export interface RemovePermissionServiceInput {
  data: Omit<RemovePermissionRequestDto, "updatedBy">;
  user: UserTokenDto;
}
export type RemovePermissionServiceResult = RemovePermissionResponseDto;

export interface AssignRoleServiceInput {
  roleId: string;
  userIds: string[];
  user: UserTokenDto;
}
export type AssignRoleServiceResult = UserRoleMapperEntity[];

export interface GetRoleUsersServiceInput {
  roleId: string;
  user: UserTokenDto;
  query: { search?: string; page: number; limit: number; ru?: boolean };
}
export interface GetRoleUsersServiceResult {
  users: Pick<
    UserEntity,
    | "id"
    | "organizationId"
    | "branchId"
    | "name"
    | "email"
    | "mobile"
    | "userType"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  >[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DuplicateRoleServiceInput {
  roleId: string;
  user: UserTokenDto;
}
export type DuplicateRoleServiceResult = RoleEntity;

export interface ToggleRoleStatusServiceInput {
  roleId: string;
  user: UserTokenDto;
}
export type ToggleRoleStatusServiceResult = RoleEntity;

export interface DeleteRoleServiceInput {
  roleId: string;
  user: UserTokenDto;
}
export interface DeleteRoleServiceResult {
  success: boolean;
}

export interface RemoveUserFromRoleServiceInput {
  roleId: string;
  userIds: string[];
  user: UserTokenDto;
}
export interface RemoveUserFromRoleServiceResult {
  success: boolean;
}

export interface GetUserPermissionKeysServiceInput {
  data: GetUserPermissionsRequestDto;
}
export type GetUserPermissionKeysServiceResult = Set<string>;

export interface GetRolesByTenantAndScopeServiceInput {
  queryDto: GetRolesRequestDto;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}
export type GetRolesByTenantAndScopeServiceResult = GetRolesResponseDto[];

export interface GetPermissionsByTenantServiceInput {
  queryDto: GetPermissionsByTenantRequestDto;
  effectiveTenant: EffectiveTenant;
}
export type GetPermissionsByTenantServiceResult =
  GetPermissionsByTenantResponseDto;

export interface GetUserRolesServiceInput {
  userId: string;
  query: { search?: string; page: number; limit: number };
}
export interface GetUserRolesServiceResult {
  roles: RoleEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ValidateUserCanManageRoleServiceInput {
  user: UserTokenDto;
  roleId: string;
}
export type ValidateUserCanManageRoleServiceResult = RoleEntity;

export interface ValidateUserCanAssignRolesServiceInput {
  user: UserTokenDto;
  roleIds: string[];
}
export type ValidateUserCanAssignRolesServiceResult = boolean;

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================

// Role Schema
export interface FindOneRoleRepoInput {
  id?: string;
  name?: string;
  organizationId?: string | null;
  branchId?: string | null;
}
export type FindOneRoleRepoResult = RoleEntity | null;

export interface FindRolesByTenantAndScopeRepoInput {
  queryDto: GetRolesRequestDto;
  effectiveTenant: EffectiveTenant;
  includeSystemRoles: boolean;
}
export type FindRolesByTenantAndScopeRepoResult = GetRolesResponseDto[];

export interface CreateRoleRepoInput {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  rank: number;
  createdBy: string;
}
export type CreateRoleRepoResult = RoleEntity;

export interface UpdateRoleRepoInput {
  roleId: string;
  name?: string;
  description?: string;
  rank?: number;
  updatedBy: string;
}
export type UpdateRoleRepoResult = RoleEntity;

export interface UpdateRoleStatusRepoInput {
  roleId: string;
  isActive: boolean;
  updatedBy: string;
}
export type UpdateRoleStatusRepoResult = RoleEntity;

export interface DeleteRoleRepoInput {
  roleId: string;
}
export type DeleteRoleRepoResult = void;

// Permission Schema
export interface FindOnePermissionRepoInput {
  id?: string;
  key?: string;
}
export type FindOnePermissionRepoResult = PermissionEntity | null;

export interface FindPermissionsByKeysRepoInput {
  keys: string[];
}
export type FindPermissionsByKeysRepoResult = PermissionEntity[];

export interface FindPermissionsByTenantRepoInput {
  queryDto: GetPermissionsByTenantRequestDto;
  effectiveTenant: EffectiveTenant;
}
export type FindPermissionsByTenantRepoResult = PermissionEntityWithAssigned[];

export interface FindUserPermissionKeysRepoInput {
  userId: string;
  organizationId?: string | null;
  branchId?: string | null;
}
export type FindUserPermissionKeysRepoResult = Set<string>;

// Permission Mapper Schema
export interface FindPermissionMappersRepoInput {
  permissionId?: string;
  entityType: number;
  entityId: string;
  isActive?: boolean;
}
export type FindPermissionMappersRepoResult = PermissionMapperEntity[];

export interface CreatePermissionMapperRepoInput {
  permissionId: string;
  entityType: number;
  entityId: string;
  organizationId: string | null;
  branchId: string | null;
  createdBy: string;
}
export type CreatePermissionMapperRepoResult = PermissionMapperEntity;

export interface CreateBulkPermissionMappersRepoInput {
  mappers: {
    entityType: number;
    entityId: string;
    permissionId: string;
    organizationId: string | null;
    branchId: string | null;
    isActive: boolean;
    createdBy: string;
  }[];
}
export type CreateBulkPermissionMappersRepoResult = void;

export interface UpdatePermissionMapperStatusRepoInput {
  mapperId: string;
  isActive: boolean;
  updatedBy: string;
}
export type UpdatePermissionMapperStatusRepoResult = PermissionMapperEntity;

// User Roles Mapper Schema
export interface FindOneTopRankedRoleRepoInput {
  userId: string;
}
export type FindOneTopRankedRoleRepoResult = RoleEntity | null;

export interface FindUserRolesRepoInput {
  userId: string;
  search?: string;
  page: number;
  limit: number;
}
export interface FindUserRolesRepoResult {
  roles: RoleEntity[];
  total: number;
}

export interface CreateUserRoleMapperRepoInput {
  userId: string;
  roleId: string;
  createdBy: string;
}
export type CreateUserRoleMapperRepoResult = UserRoleMapperEntity;

export interface CreateUserRoleMappersRepoInput {
  mappers: { userId: string; roleId: string; createdBy: string }[];
}
export type CreateUserRoleMappersRepoResult = UserRoleMapperEntity[];

export interface DeleteUserRoleMappersRepoInput {
  userIds: string[];
  roleId: string;
}
export type DeleteUserRoleMappersRepoResult = void;
