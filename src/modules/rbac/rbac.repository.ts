import type { Database } from "../../config/db";
import { PermissionStatusEnum } from "../../shared/enums/rbac/PermissionEnums";
import { roles, type RoleEntity } from "./schemas/role.schema";
import { permissions, type PermissionEntity } from "./schemas/permission.schema";
import { permissionsMapper, type PermissionMapperEntity } from "./schemas/role-permission-mapper.schema";
import { userRolesMapper, type UserRoleMapperEntity } from "./schemas/user-roles-mapper.schema";
import type { 
  CreateRoleDto, 
  CreatePermissionDto, 
  CreatePermissionMapperDto, 
  CreateUserRoleMapperDto 
} from "./rbac.types";

export class RbacRepository {
  constructor(private readonly database: Database) {}

  async createRole(data: CreateRoleDto): Promise<RoleEntity> {
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

  async createPermission(data: CreatePermissionDto): Promise<PermissionEntity> {
    const [permission] = await this.database.client
      .insert(permissions)
      .values({
        key: data.key,
        organizationId: data.organizationId ?? null,
        branchId: data.branchId ?? null,
        status: data.status ?? PermissionStatusEnum.ENABLED,
        createdBy: data.createdBy,
      })
      .returning();
    if (!permission) throw new Error("Failed to create permission");
    return permission;
  }

  async createPermissionMapper(data: CreatePermissionMapperDto): Promise<PermissionMapperEntity> {
    const [mapper] = await this.database.client
      .insert(permissionsMapper)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        permissionId: data.permissionId,
        createdBy: data.createdBy,
      })
      .returning();
    if (!mapper) throw new Error("Failed to create permission mapper");
    return mapper;
  }

  async createUserRoleMapper(data: CreateUserRoleMapperDto): Promise<UserRoleMapperEntity> {
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
}
