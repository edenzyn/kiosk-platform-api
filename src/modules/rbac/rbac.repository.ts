import { and, count, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";
import type { PermissionEntityWithAssigned } from "./dtos/permission/get-permissions-by-tenant.dtos";
import type { GetRolesResponseDto } from "./dtos/role/get-roles.dtos";
import type {
  CreateBulkPermissionMappersRepoInput,
  CreateBulkPermissionMappersRepoResult,
  CreatePermissionMapperRepoInput,
  CreatePermissionMapperRepoResult,
  CreateRoleRepoInput,
  CreateRoleRepoResult,
  CreateUserRoleMapperRepoInput,
  CreateUserRoleMapperRepoResult,
  CreateUserRoleMappersRepoInput,
  CreateUserRoleMappersRepoResult,
  DeleteRoleRepoInput,
  DeleteRoleRepoResult,
  DeleteUserRoleMappersRepoInput,
  DeleteUserRoleMappersRepoResult,
  FindOnePermissionRepoInput,
  FindOnePermissionRepoResult,
  FindOneRoleRepoInput,
  FindOneRoleRepoResult,
  FindOneTopRankedRoleRepoInput,
  FindOneTopRankedRoleRepoResult,
  FindPermissionMappersRepoInput,
  FindPermissionMappersRepoResult,
  FindPermissionsByKeysRepoInput,
  FindPermissionsByKeysRepoResult,
  FindPermissionsByTenantRepoInput,
  FindPermissionsByTenantRepoResult,
  FindRolesByTenantAndScopeRepoInput,
  FindRolesByTenantAndScopeRepoResult,
  FindUserPermissionKeysRepoInput,
  FindUserPermissionKeysRepoResult,
  FindUserRolesRepoInput,
  FindUserRolesRepoResult,
  UpdatePermissionMapperStatusRepoInput,
  UpdatePermissionMapperStatusRepoResult,
  UpdateRoleRepoInput,
  UpdateRoleRepoResult,
  UpdateRoleStatusRepoInput,
  UpdateRoleStatusRepoResult,
} from "./rbac.types";
import { permissionMapper as permissionsMapper } from "./schemas/permission-mapper.schema";
import { permissions } from "./schemas/permission.schema";
import { roles } from "./schemas/role.schema";
import { userRolesMapper } from "./schemas/user-roles-mapper.schema";

export class RbacRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? ROLE SCHEMA METHODS
  // ========================================
  async findOneRole(
    input: FindOneRoleRepoInput,
  ): Promise<FindOneRoleRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) conditions.push(eq(roles.id, input.id));
    if (input.name !== undefined) conditions.push(eq(roles.name, input.name));
    if (input.organizationId !== undefined) {
      conditions.push(
        input.organizationId === null
          ? eq(roles.organizationId, null as unknown as string)
          : eq(roles.organizationId, input.organizationId),
      );
    }
    if (input.branchId !== undefined) {
      conditions.push(
        input.branchId === null
          ? eq(roles.branchId, null as unknown as string)
          : eq(roles.branchId, input.branchId),
      );
    }

    if (conditions.length === 0) {
      return null;
    }

    const [role] = await this.database.client
      .select()
      .from(roles)
      .where(and(...conditions))
      .limit(1);

    return role || null;
  }

  async findRolesByTenantAndScope(
    input: FindRolesByTenantAndScopeRepoInput,
  ): Promise<FindRolesByTenantAndScopeRepoResult> {
    const { queryDto, effectiveTenant, includeSystemRoles } = input;
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

  async createRole(input: CreateRoleRepoInput): Promise<CreateRoleRepoResult> {
    const [role] = await this.database.client
      .insert(roles)
      .values({
        organizationId: input.organizationId ?? null,
        branchId: input.branchId ?? null,
        name: input.name,
        description: input.description ?? null,
        rank: input.rank,
        createdBy: input.createdBy,
      })
      .returning();
    if (!role) throw new Error("Failed to create role");
    return role;
  }

  async updateRole(input: UpdateRoleRepoInput): Promise<UpdateRoleRepoResult> {
    const fieldsToUpdate: Record<string, unknown> = {
      updatedBy: input.updatedBy,
    };
    if (input.name !== undefined) fieldsToUpdate.name = input.name;
    if (input.description !== undefined)
      fieldsToUpdate.description = input.description;
    if (input.rank !== undefined) fieldsToUpdate.rank = input.rank;

    const [updatedRole] = await this.database.client
      .update(roles)
      .set(fieldsToUpdate)
      .where(and(eq(roles.id, input.roleId), eq(roles.isActive, true)))
      .returning();

    if (!updatedRole) {
      throw new Error("Role not found or inactive");
    }

    return updatedRole;
  }

  async updateRoleStatus(
    input: UpdateRoleStatusRepoInput,
  ): Promise<UpdateRoleStatusRepoResult> {
    const [updated] = await this.database.client
      .update(roles)
      .set({
        isActive: input.isActive,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, input.roleId))
      .returning();
    if (!updated) throw new Error("Role not found");
    return updated;
  }

  async deleteRole(input: DeleteRoleRepoInput): Promise<DeleteRoleRepoResult> {
    await this.database.client.transaction(async (tx) => {
      // 1. Delete permission mappings
      await tx
        .delete(permissionsMapper)
        .where(
          and(
            eq(permissionsMapper.entityType, PermissionEntityType.ROLE),
            eq(permissionsMapper.entityId, input.roleId),
          ),
        );

      // 2. Delete user role mappings
      await tx
        .delete(userRolesMapper)
        .where(eq(userRolesMapper.roleId, input.roleId));

      // 3. Delete the role itself
      await tx
        .delete(roles)
        .where(and(eq(roles.id, input.roleId), eq(roles.isSystem, false)));
    });
  }

  // ========================================
  // ? PERMISSION SCHEMA METHODS
  // ========================================
  async findOnePermission(
    input: FindOnePermissionRepoInput,
  ): Promise<FindOnePermissionRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) {
      conditions.push(eq(permissions.id, input.id));
    }
    if (input.key !== undefined) {
      conditions.push(eq(permissions.key, input.key));
    }

    if (conditions.length === 0) {
      return null;
    }

    const [permission] = await this.database.client
      .select()
      .from(permissions)
      .where(and(...conditions))
      .limit(1);

    return permission || null;
  }

  async findPermissionsByKeys(
    input: FindPermissionsByKeysRepoInput,
  ): Promise<FindPermissionsByKeysRepoResult> {
    if (input.keys.length === 0) return [];
    return await this.database.client
      .select()
      .from(permissions)
      .where(inArray(permissions.key, input.keys));
  }

  async findPermissionsByTenant(
    input: FindPermissionsByTenantRepoInput,
  ): Promise<FindPermissionsByTenantRepoResult> {
    const { queryDto, effectiveTenant } = input;
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

  async findUserPermissionKeys(
    input: FindUserPermissionKeysRepoInput,
  ): Promise<FindUserPermissionKeysRepoResult> {
    const orgIdVal = input.organizationId || null;
    const branchIdVal = input.branchId || null;

    const queryResult = await this.database.client.execute<{ key: string }>(
      sql`SELECT key FROM fn_get_user_permission_keys_by_tenant(${input.userId}, ${orgIdVal}, ${branchIdVal})`,
    );

    return new Set(queryResult.rows.map((row) => row.key));
  }

  // ========================================
  // ? PERMISSION MAPPER SCHEMA METHODS
  // ========================================
  async findPermissionMappers(
    input: FindPermissionMappersRepoInput,
  ): Promise<FindPermissionMappersRepoResult> {
    const conditions = [
      eq(permissionsMapper.entityType, input.entityType),
      eq(permissionsMapper.entityId, input.entityId),
    ];
    if (input.permissionId) {
      conditions.push(eq(permissionsMapper.permissionId, input.permissionId));
    }
    if (input.isActive !== undefined) {
      conditions.push(eq(permissionsMapper.isActive, input.isActive));
    }
    return this.database.client
      .select()
      .from(permissionsMapper)
      .where(and(...conditions));
  }

  async createPermissionMapper(
    input: CreatePermissionMapperRepoInput,
  ): Promise<CreatePermissionMapperRepoResult> {
    const [inserted] = await this.database.client
      .insert(permissionsMapper)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        permissionId: input.permissionId,
        organizationId: input.organizationId,
        branchId: input.branchId,
        isActive: true,
        createdBy: input.createdBy,
      })
      .returning();
    if (!inserted) throw new Error("Failed to create permission mapper");
    return inserted;
  }

  async createBulkPermissionMappers(
    input: CreateBulkPermissionMappersRepoInput,
  ): Promise<CreateBulkPermissionMappersRepoResult> {
    if (input.mappers.length === 0) return;
    await this.database.client.insert(permissionsMapper).values(input.mappers);
  }

  async updatePermissionMapperStatus(
    input: UpdatePermissionMapperStatusRepoInput,
  ): Promise<UpdatePermissionMapperStatusRepoResult> {
    const [updated] = await this.database.client
      .update(permissionsMapper)
      .set({
        isActive: input.isActive,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(permissionsMapper.id, input.mapperId))
      .returning();
    if (!updated) throw new Error("Failed to update permission mapper status");
    return updated;
  }

  // ========================================
  // ? USER ROLES MAPPER SCHEMA METHODS
  // ========================================
  async findOneTopRankedRole(
    input: FindOneTopRankedRoleRepoInput,
  ): Promise<FindOneTopRankedRoleRepoResult> {
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
      .where(
        and(eq(userRolesMapper.userId, input.userId), eq(roles.isActive, true)),
      )
      .orderBy(roles.rank)
      .limit(1);

    return topRole || null;
  }

  async findUserRoles(
    input: FindUserRolesRepoInput,
  ): Promise<FindUserRolesRepoResult> {
    const conditions = [eq(userRolesMapper.userId, input.userId)];
    if (input.search) {
      conditions.push(ilike(roles.name, `%${input.search}%`));
    }

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(userRolesMapper)
      .innerJoin(roles, eq(userRolesMapper.roleId, roles.id))
      .where(and(...conditions));
    const total = Number(countResult?.count || 0);

    const rows = await this.database.client
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
      .where(and(...conditions))
      .orderBy(roles.rank)
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);

    return { roles: rows, total };
  }

  async createUserRoleMapper(
    input: CreateUserRoleMapperRepoInput,
  ): Promise<CreateUserRoleMapperRepoResult> {
    const [mapper] = await this.database.client
      .insert(userRolesMapper)
      .values({
        userId: input.userId,
        roleId: input.roleId,
        createdBy: input.createdBy,
      })
      .returning();
    if (!mapper) throw new Error("Failed to create user role mapper");
    return mapper;
  }

  async createUserRoleMappers(
    input: CreateUserRoleMappersRepoInput,
  ): Promise<CreateUserRoleMappersRepoResult> {
    if (input.mappers.length === 0) return [];
    return await this.database.client
      .insert(userRolesMapper)
      .values(input.mappers)
      .returning();
  }

  async deleteUserRoleMappers(
    input: DeleteUserRoleMappersRepoInput,
  ): Promise<DeleteUserRoleMappersRepoResult> {
    await this.database.client
      .delete(userRolesMapper)
      .where(
        and(
          inArray(userRolesMapper.userId, input.userIds),
          eq(userRolesMapper.roleId, input.roleId),
        ),
      );
  }
}
