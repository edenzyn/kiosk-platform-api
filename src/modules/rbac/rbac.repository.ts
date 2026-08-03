import { sql } from "drizzle-orm";
import type { Database } from "../../config/db";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreatePermissionMapperRequestDto } from "./dtos/create-permission-mapper-request.dto";
import type { CreatePermissionRequestDto } from "./dtos/create-permission-request.dto";
import type { CreateRoleRequestDto } from "./dtos/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/create-user-role-mapper-request.dto";
import type { GetRolesRequestDto } from "./dtos/get-roles-request.dto";
import type { GetRolesResponseDto } from "./dtos/get-roles-response.dto";
import type { GetUserPermissionsRequestDto } from "./dtos/get-user-permissions-request.dto";
import {
  permissionMapper as permissionsMapper,
  type PermissionMapperEntity,
} from "./schemas/permission-mapper.schema";
import {
  permissions,
  type PermissionEntity,
} from "./schemas/permission.schema";
import { roles, type RoleEntity } from "./schemas/role.schema";
import {
  userRolesMapper,
  type UserRoleMapperEntity,
} from "./schemas/user-roles-mapper.schema";

export class RbacRepository {
  constructor(private readonly database: Database) {}

  async createRole(data: CreateRoleRequestDto): Promise<RoleEntity> {
    const [role] = await this.database.client
      .insert(roles)
      .values({
        organizationId: data.organizationId ?? null,
        branchId: data.branchId ?? null,
        name: data.name,
        description: data.description ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    if (!role) throw new Error("Failed to create role");
    return role;
  }

  async createPermission(
    data: CreatePermissionRequestDto,
  ): Promise<PermissionEntity> {
    const [permission] = await this.database.client
      .insert(permissions)
      .values({
        key: data.key,
        description: data.description ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    if (!permission) throw new Error("Failed to create permission");
    return permission;
  }

  async createPermissionMapper(
    data: CreatePermissionMapperRequestDto,
  ): Promise<PermissionMapperEntity> {
    const [mapper] = await this.database.client
      .insert(permissionsMapper)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        permissionId: data.permissionId,
        organizationId: data.organizationId ?? null,
        branchId: data.branchId ?? null,
        createdBy: data.createdBy,
      })
      .returning();
    if (!mapper) throw new Error("Failed to create permission mapper");
    return mapper;
  }

  async createUserRoleMapper(
    data: CreateUserRoleMapperRequestDto,
  ): Promise<UserRoleMapperEntity> {
    const [mapper] = await this.database.client
      .insert(userRolesMapper)
      .values({
        userId: data.userId,
        roleId: data.roleId,
        createdBy: data.createdBy,
      })
      .returning();
    if (!mapper) throw new Error("Failed to create user role mapper");
    return mapper;
  }

  async getUserPermissionKeys(
    data: GetUserPermissionsRequestDto,
  ): Promise<Set<string>> {
    const orgIdVal = data.organizationId ?? null;
    const branchIdVal = data.branchId ?? null;

    const result = await this.database.client.execute<{ key: string }>(
      sql`SELECT * FROM fn_get_user_permission_keys_by_tenant(
      ${data.userId},
      ${orgIdVal},
      ${branchIdVal}
    )`,
    );

    return new Set(result.rows.map((row) => row.key));
  }

  async getRoles(
    queryDto: GetRolesRequestDto,
    userToken: UserTokenDto,
  ): Promise<GetRolesResponseDto[]> {
    const searchVal = queryDto.search || null;
    const orgIdVal = userToken.organizationId || null;
    const branchIdVal = userToken.branchId || null;

    const queryResult = await this.database.client.execute<GetRolesResponseDto>(
      sql`SELECT * FROM fn_get_roles_by_tenant(${searchVal}, ${orgIdVal}, ${branchIdVal})`,
    );

    return queryResult.rows;
  }
}
