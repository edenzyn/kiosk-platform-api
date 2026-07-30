import { eq, and, or, isNull } from "drizzle-orm";
import type { Database } from "../../config/db";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { roles, type RoleEntity } from "./schemas/role.schema";
import {
  permissions,
  type PermissionEntity,
} from "./schemas/permission.schema";
import {
  permissionMapper as permissionsMapper,
  type PermissionMapperEntity,
} from "./schemas/permission-mapper.schema";
import {
  userRolesMapper,
  type UserRoleMapperEntity,
} from "./schemas/user-roles-mapper.schema";
import type {
  CreateRoleRequestDto,
  CreatePermissionRequestDto,
  CreatePermissionMapperRequestDto,
  CreateUserRoleMapperRequestDto,
  GetUserPermissionsRequestDto,
} from "./rbac.types";

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

  async getUserPermissions(
    data: GetUserPermissionsRequestDto,
  ): Promise<Set<string>> {
    const orgCondition = data.organizationId
      ? or(
          eq(permissionsMapper.organizationId, data.organizationId),
          isNull(permissionsMapper.organizationId),
        )
      : isNull(permissionsMapper.organizationId);

    const branchCondition = data.branchId
      ? or(
          eq(permissionsMapper.branchId, data.branchId),
          isNull(permissionsMapper.branchId),
        )
      : isNull(permissionsMapper.branchId);

    const directPerms = await this.database.client
      .select({ key: permissions.key })
      .from(permissions)
      .innerJoin(
        permissionsMapper,
        eq(permissions.id, permissionsMapper.permissionId),
      )
      .where(
        and(
          eq(permissionsMapper.entityType, PermissionEntityType.USER),
          eq(permissionsMapper.entityId, data.userId),
          eq(permissions.isActive, true),
          orgCondition,
          branchCondition,
        ),
      );

    const rolePerms = await this.database.client
      .select({ key: permissions.key })
      .from(permissions)
      .innerJoin(
        permissionsMapper,
        eq(permissions.id, permissionsMapper.permissionId),
      )
      .innerJoin(
        userRolesMapper,
        eq(userRolesMapper.roleId, permissionsMapper.entityId),
      )
      .innerJoin(roles, eq(roles.id, userRolesMapper.roleId))
      .where(
        and(
          eq(permissionsMapper.entityType, PermissionEntityType.ROLE),
          eq(userRolesMapper.userId, data.userId),
          eq(permissions.isActive, true),
          eq(roles.isActive, true),
          orgCondition,
          branchCondition,
        ),
      );

    const allPerms = new Set<string>();
    directPerms.forEach((p) => allPerms.add(p.key));
    rolePerms.forEach((p) => allPerms.add(p.key));

    return allPerms;
  }
}
