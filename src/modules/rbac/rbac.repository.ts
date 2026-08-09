import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../config/db";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";

import type { CreateRoleRequestDto } from "./dtos/role/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/role/create-user-role-mapper-request.dto";
import type { GetPermissionsByTenantRequestDto } from "./dtos/permission/get-permissions-by-tenant-request.dto";
import type { PermissionEntityWithAssigned } from "./dtos/permission/get-permissions-by-tenant-response.dto";
import type { GetRolesRequestDto } from "./dtos/role/get-roles-request.dto";
import type { GetRolesResponseDto } from "./dtos/role/get-roles-response.dto";
import type { GetUserPermissionsRequestDto } from "./dtos/permission/get-user-permissions-request.dto";
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
        rank: data.rank,
        createdBy: data.createdBy,
      })
      .returning();
    if (!role) throw new Error("Failed to create role");
    return role;
  }

  async updateRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      rank?: number;
      updatedBy: string;
    },
  ): Promise<RoleEntity> {
    const fieldsToUpdate: Record<string, unknown> = {
      updatedBy: data.updatedBy,
    };
    if (data.name !== undefined) fieldsToUpdate.name = data.name;
    if (data.description !== undefined)
      fieldsToUpdate.description = data.description;
    if (data.rank !== undefined) fieldsToUpdate.rank = data.rank;

    const [updatedRole] = await this.database.client
      .update(roles)
      .set(fieldsToUpdate)
      .where(and(eq(roles.id, roleId), eq(roles.isActive, true)))
      .returning();

    if (!updatedRole) {
      throw new Error("Role not found or inactive");
    }

    return updatedRole;
  }

  async getPermissionMappers(data: {
    permissionId?: string;
    entityType: number;
    entityId: string;
    isActive?: boolean;
  }): Promise<PermissionMapperEntity[]> {
    const conditions = [
      eq(permissionsMapper.entityType, data.entityType),
      eq(permissionsMapper.entityId, data.entityId),
    ];
    if (data.permissionId) {
      conditions.push(eq(permissionsMapper.permissionId, data.permissionId));
    }
    if (data.isActive) {
      conditions.push(eq(permissionsMapper.isActive, data.isActive));
    }
    return this.database.client
      .select()
      .from(permissionsMapper)
      .where(and(...conditions));
  }

  async createPermissionMapper(data: {
    permissionId: string;
    entityType: number;
    entityId: string;
    organizationId: string | null;
    branchId: string | null;
    createdBy: string;
  }): Promise<PermissionMapperEntity> {
    const [inserted] = await this.database.client
      .insert(permissionsMapper)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        permissionId: data.permissionId,
        organizationId: data.organizationId,
        branchId: data.branchId,
        isActive: true,
        createdBy: data.createdBy,
      })
      .returning();
    if (!inserted) throw new Error("Failed to create permission mapper");
    return inserted;
  }

  async updatePermissionMapperStatus(
    mapperId: string,
    isActive: boolean,
    updatedBy: string,
  ): Promise<PermissionMapperEntity> {
    const [updated] = await this.database.client
      .update(permissionsMapper)
      .set({
        isActive,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(permissionsMapper.id, mapperId))
      .returning();
    if (!updated) throw new Error("Failed to update permission mapper status");
    return updated;
  }

  async getRoleById(id: string): Promise<RoleEntity | null> {
    const [role] = await this.database.client
      .select()
      .from(roles)
      .where(eq(roles.id, id));
    return role || null;
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

  async createUserRoleMappers(
    data: { userId: string; roleId: string; createdBy: string }[],
  ): Promise<UserRoleMapperEntity[]> {
    if (data.length === 0) return [];
    return await this.database.client
      .insert(userRolesMapper)
      .values(data)
      .returning();
  }

  async getUserPermissionKeys(
    data: GetUserPermissionsRequestDto,
  ): Promise<Set<string>> {
    const orgIdVal = data.organizationId || null;
    const branchIdVal = data.branchId || null;

    const queryResult = await this.database.client.execute<{ key: string }>(
      sql`SELECT key FROM fn_get_user_permission_keys_by_tenant(${data.userId}, ${orgIdVal}, ${branchIdVal})`,
    );

    return new Set(queryResult.rows.map((row) => row.key));
  }

  async getRolesByTenantAndScope(
    queryDto: GetRolesRequestDto,
    effectiveTenant: EffectiveTenant,
    includeSystemRoles: boolean,
  ): Promise<GetRolesResponseDto[]> {
    const searchVal = queryDto.search ? `%${queryDto.search}%` : null;

    const orgIdVal = effectiveTenant.organizationId;
    const branchIdVal =
      queryDto.branchId !== undefined
        ? queryDto.branchId
        : effectiveTenant.branchId;
    const includeSystemRolesVal = includeSystemRoles || queryDto.sys;

    const queryResult = await this.database.client.execute<GetRolesResponseDto>(
      sql`SELECT * FROM fn_get_roles_by_tenant_and_scope(${searchVal}, ${orgIdVal}, ${branchIdVal}, ${includeSystemRolesVal})`,
    );

    return queryResult.rows;
  }

  async getPermissionsByTenant(
    queryDto: GetPermissionsByTenantRequestDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<PermissionEntityWithAssigned[]> {
    const entityIdVal = queryDto.entityId || null;
    const entityTypeVal = queryDto.entityType || null;
    const orgIdVal = effectiveTenant.organizationId;
    const branchIdVal = effectiveTenant.branchId;
    const scopeVal = effectiveTenant.branchId
      ? PermissionScope.BRANCH
      : PermissionScope.ORGANIZATION;
    const isPrivilegedIncludedVal =
      queryDto.isPrivilegedPermissionsIncluded ?? true;

    const queryResult =
      await this.database.client.execute<PermissionEntityWithAssigned>(
        sql`SELECT * FROM fn_get_permissions_by_scope_and_tenant(${entityIdVal}, ${entityTypeVal}, ${orgIdVal}, ${branchIdVal}, ${scopeVal}, ${isPrivilegedIncludedVal})`,
      );

    return queryResult.rows;
  }

  async getUsersTopRankedRole(userId: string): Promise<RoleEntity | null> {
    const [topRole] = await this.database.client
      .select({
        id: roles.id,
        organizationId: roles.organizationId,
        branchId: roles.branchId,
        name: roles.name,
        description: roles.description,
        rank: roles.rank,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        createdBy: roles.createdBy,
        updatedBy: roles.updatedBy,
      })
      .from(userRolesMapper)
      .innerJoin(roles, eq(userRolesMapper.roleId, roles.id))
      .where(and(eq(userRolesMapper.userId, userId), eq(roles.isActive, true)))
      .orderBy(roles.rank)
      .limit(1);

    return topRole || null;
  }

  async getPermissionById(id: string): Promise<PermissionEntity | null> {
    const [permission] = await this.database.client
      .select()
      .from(permissions)
      .where(eq(permissions.id, id));

    return permission || null;
  }

  async getPermissionsByKeys(keys: string[]): Promise<PermissionEntity[]> {
    if (keys.length === 0) return [];
    return await this.database.client
      .select()
      .from(permissions)
      .where(inArray(permissions.key, keys));
  }

  async bulkInsertPermissionMappers(
    mappers: {
      entityType: number;
      entityId: string;
      permissionId: string;
      organizationId: string | null;
      branchId: string | null;
      isActive: boolean;
      createdBy: string;
    }[],
  ): Promise<void> {
    if (mappers.length === 0) return;
    await this.database.client.insert(permissionsMapper).values(mappers);
  }

  async setRoleStatus(
    roleId: string,
    isActive: boolean,
    updatedBy: string,
  ): Promise<RoleEntity> {
    const [updated] = await this.database.client
      .update(roles)
      .set({ isActive, updatedBy, updatedAt: new Date() })
      .where(eq(roles.id, roleId))
      .returning();
    if (!updated) throw new Error("Role not found");
    return updated;
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.database.client
      .delete(roles)
      .where(and(eq(roles.id, roleId), eq(roles.isSystem, false)));
  }

  async removeUserFromRole(userIds: string[], roleId: string): Promise<void> {
    await this.database.client
      .delete(userRolesMapper)
      .where(
        and(
          inArray(userRolesMapper.userId, userIds),
          eq(userRolesMapper.roleId, roleId),
        ),
      );
  }
}
