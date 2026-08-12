import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";
import { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { getUserScope } from "../../shared/utils/user/user-scope.helper";
import type { UserRepository } from "../user/user.repository";
import type { AssignPermissionRequestDto, AssignPermissionResponseDto } from "./dtos/permission/assign-permission.dtos";
import type { GetPermissionsByTenantRequestDto, GetPermissionsByTenantResponseDto } from "./dtos/permission/get-permissions-by-tenant.dtos";
import type { GetUserPermissionsRequestDto } from "./dtos/permission/get-user-permissions.dtos";
import type { RemovePermissionRequestDto, RemovePermissionResponseDto } from "./dtos/permission/remove-permission.dtos";
import type { CreateRoleRequestDto } from "./dtos/role/create-role.dtos";
import type { GetRolesRequestDto, GetRolesResponseDto } from "./dtos/role/get-roles.dtos";
import type { UpdateRoleRequestDto } from "./dtos/role/update-role.dtos";
import type { RbacRepository } from "./rbac.repository";
import type { RoleEntity } from "./schemas/role.schema";

export class RbacService {
  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly userRepository: UserRepository,
  ) {}

  private async _getUsersTopRankedRole(
    userId: string,
  ): Promise<RoleEntity | null> {
    return await this.rbacRepository.getUsersTopRankedRole({ userId });
  }

  private async _getUserTopPermissionScope(
    user: UserTokenDto,
  ): Promise<number> {
    const topRole = await this._getUsersTopRankedRole(user.id);
    if (topRole) {
      if (!topRole.organizationId && !topRole.branchId) {
        return PermissionScope.PLATFORM;
      }
      if (topRole.organizationId && !topRole.branchId) {
        return PermissionScope.ORGANIZATION;
      }
      if (topRole.branchId) {
        return PermissionScope.BRANCH;
      }
    }
    if (user.branchId) return PermissionScope.BRANCH;
    if (user.organizationId) return PermissionScope.ORGANIZATION;
    return PermissionScope.PLATFORM;
  }

  private async _assertCanActOnRole(
    user: UserTokenDto,
    roleId: string,
  ): Promise<void> {
    const targetRole = await this.rbacRepository.getRoleById({ id: roleId });
    if (!targetRole) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const isBranchRole = Boolean(targetRole.branchId);
    const isOrgUser = getUserScope(user) === UserScopeTypeEnums.ORGANIZATION;
    // Org-level users can always manage branch-level roles
    const isBypassed = isOrgUser && isBranchRole;

    if (!isBypassed) {
      const userTopRole = await this._getUsersTopRankedRole(user.id);
      if (userTopRole && targetRole.rank <= userTopRole.rank) {
        throw new AppError(
          "Cannot act on a role with equal or higher rank than your top role",
          { statusCode: HttpStatusCodes.FORBIDDEN },
        );
      }
    }
  }

  async createRole(
    data: Omit<CreateRoleRequestDto, "createdBy">,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    const isBranchRole = Boolean(data.branchId || effectiveTenant.branchId);
    const isOrgUser = getUserScope(user) === UserScopeTypeEnums.ORGANIZATION;
    const isBypassed = isOrgUser && isBranchRole;

    const userTopRole = await this._getUsersTopRankedRole(user.id);
    if (!isBypassed && userTopRole && data.rank <= userTopRole.rank) {
      throw new AppError(
        "Cannot create a role with equal or higher rank than your top role",
        { statusCode: HttpStatusCodes.FORBIDDEN },
      );
    }

    const role = await this.rbacRepository.createRole({
      organizationId:
        data.organizationId || effectiveTenant.organizationId || null,
      branchId: data.branchId || effectiveTenant.branchId || null,
      name: data.name,
      description: data.description,
      rank: data.rank,
      createdBy: user.id,
    });

    if (data.permissions && data.permissions.length > 0) {
      for (const permissionId of data.permissions) {
        await this.assignPermission(
          {
            permissionId,
            entityType: PermissionEntityType.ROLE,
            entityId: role.id,
          },
          user,
          effectiveTenant,
        );
      }
    }

    return role;
  }

  async updateRole(data: UpdateRoleRequestDto, user: UserTokenDto) {
    const targetRole = await this.rbacRepository.getRoleById({ id: data.roleId });
    if (!targetRole) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const isBranchRole = Boolean(targetRole.branchId);
    const isOrgUser = getUserScope(user) === UserScopeTypeEnums.ORGANIZATION;
    const isBypassed = isOrgUser && isBranchRole;

    const userTopRole = await this._getUsersTopRankedRole(user.id);
    if (!isBypassed && userTopRole) {
      if (targetRole.rank <= userTopRole.rank) {
        throw new AppError(
          "Cannot update a role with equal or higher rank than your top role",
          { statusCode: HttpStatusCodes.FORBIDDEN },
        );
      }

      if (data.rank !== undefined && data.rank <= userTopRole.rank) {
        throw new AppError(
          "Cannot assign a rank equal to or higher than your top role",
          { statusCode: HttpStatusCodes.FORBIDDEN },
        );
      }
    }

    const updatedRole = await this.rbacRepository.updateRole({
      roleId: data.roleId,
      name: data.name,
      description: data.description,
      rank: data.rank,
      updatedBy: user.id,
    });

    return updatedRole;
  }

  async assignPermission(
    data: Omit<AssignPermissionRequestDto, "createdBy">,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<AssignPermissionResponseDto> {
    const permission = await this.rbacRepository.getPermissionById({ id: data.permissionId });
    if (!permission) {
      throw new AppError("Permission not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (permission.isPrivileged) {
      const topScope = await this._getUserTopPermissionScope(user);
      if (permission.scope === topScope) {
        throw new AppError(
          "Cannot assign privileged permissions of your own scope level",
          { statusCode: HttpStatusCodes.FORBIDDEN },
        );
      }
    }

    const mappers = await this.rbacRepository.getPermissionMappers({
      permissionId: data.permissionId,
      entityType: data.entityType,
      entityId: data.entityId,
    });
    const existing = mappers[0];

    if (existing) {
      const mapper = await this.rbacRepository.updatePermissionMapperStatus({
        mapperId: existing.id,
        isActive: true,
        updatedBy: user.id,
      });
      return { mapper };
    }

    let organizationId: string | null = effectiveTenant.organizationId || null;
    let branchId: string | null = effectiveTenant.branchId || null;

    if (data.entityType === PermissionEntityType.ROLE) {
      const role = await this.rbacRepository.getRoleById({ id: data.entityId });
      if (role) {
        organizationId = role.organizationId || organizationId;
        branchId = role.branchId || branchId;
      }
    } else if (data.entityType === PermissionEntityType.USER) {
      const targetUser = await this.userRepository.findById({ id: data.entityId });
      if (targetUser) {
        organizationId = targetUser.organizationId || organizationId;
        branchId = targetUser.branchId || branchId;
      }
    }

    const mapper = await this.rbacRepository.createPermissionMapper({
      permissionId: data.permissionId,
      entityType: data.entityType,
      entityId: data.entityId,
      organizationId,
      branchId,
      createdBy: user.id,
    });

    return { mapper };
  }

  async removePermission(
    data: Omit<RemovePermissionRequestDto, "updatedBy">,
    user: UserTokenDto,
  ): Promise<RemovePermissionResponseDto> {
    const permission = await this.rbacRepository.getPermissionById({ id: data.permissionId });
    if (!permission) {
      throw new AppError("Permission not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (permission.isPrivileged) {
      const topScope = await this._getUserTopPermissionScope(user);
      if (permission.scope === topScope) {
        throw new AppError(
          "Cannot remove privileged permissions of your own scope level",
          { statusCode: HttpStatusCodes.FORBIDDEN },
        );
      }
    }

    const mappers = await this.rbacRepository.getPermissionMappers({
      permissionId: data.permissionId,
      entityType: data.entityType,
      entityId: data.entityId,
    });
    const existing = mappers[0];

    if (!existing) {
      throw new AppError("Permission mapping not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const mapper = await this.rbacRepository.updatePermissionMapperStatus({
      mapperId: existing.id,
      isActive: false,
      updatedBy: user.id,
    });

    return { mapper };
  }

  async assignRole(roleId: string, userIds: string[], user: UserTokenDto) {
    await this._assertCanActOnRole(user, roleId);
    const mappersData = userIds.map((userId) => ({
      roleId,
      userId,
      createdBy: user.id,
    }));
    return this.rbacRepository.createUserRoleMappers({ mappers: mappersData });
  }

  async getUsersByRoleId(
    roleId: string,
    user: UserTokenDto,
    query: { search?: string; page: number; limit: number; ru?: boolean },
  ) {
    await this._assertCanActOnRole(user, roleId);

    const targetRole = await this.rbacRepository.getRoleById({ id: roleId });
    if (!targetRole) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const page = query.page;
    const limit = query.limit;
    const search = query?.search;

    const { users, total } = await this.userRepository.getUsersByRoleId({
      roleId,
      organizationId: targetRole.organizationId || undefined,
      branchId: targetRole.branchId || undefined,
      search,
      page,
      limit,
      ru: query.ru,
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async duplicateRole(roleId: string, user: UserTokenDto) {
    await this._assertCanActOnRole(user, roleId);
    console.log(roleId);
    const source = await this.rbacRepository.getRoleById({ id: roleId });
    console.log(source);
    if (!source) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const newRole = await this.rbacRepository.createRole({
      organizationId: source.organizationId,
      branchId: source.branchId,
      name: `${source.name ?? "Role"} (Copy)`,
      description: source.description,
      rank: source.rank,
      createdBy: user.id,
    });

    const existingMappers = await this.rbacRepository.getPermissionMappers({
      entityId: roleId,
      entityType: PermissionEntityType.ROLE,
      isActive: true,
    });
    if (existingMappers.length > 0) {
      await Promise.all(
        existingMappers.map((m) =>
          this.rbacRepository.createPermissionMapper({
            permissionId: m.permissionId,
            entityType: PermissionEntityType.ROLE,
            entityId: newRole.id,
            organizationId: m.organizationId,
            branchId: m.branchId,
            createdBy: user.id,
          }),
        ),
      );
    }

    return newRole;
  }

  async toggleRoleStatus(roleId: string, user: UserTokenDto) {
    const targetRole = await this.rbacRepository.getRoleById({ id: roleId });
    if (!targetRole) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }
    if (targetRole.isSystem) {
      throw new AppError("Cannot toggle a system role", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }
    await this._assertCanActOnRole(user, roleId);
    return this.rbacRepository.setRoleStatus({
      roleId,
      isActive: !targetRole.isActive,
      updatedBy: user.id,
    });
  }

  async deleteRole(roleId: string, user: UserTokenDto) {
    const targetRole = await this.rbacRepository.getRoleById({ id: roleId });
    if (!targetRole) {
      throw new AppError("Role not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }
    if (targetRole.isSystem) {
      throw new AppError("Cannot delete a system role", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }
    await this._assertCanActOnRole(user, roleId);
    await this.rbacRepository.deleteRole({ roleId });
    return { success: true };
  }

  async removeUserFromRole(
    roleId: string,
    userIds: string[],
    user: UserTokenDto,
  ) {
    await this._assertCanActOnRole(user, roleId);
    await this.rbacRepository.removeUserFromRole({ userIds, roleId });
    return { success: true };
  }

  async getUserPermissionKeys(
    data: GetUserPermissionsRequestDto,
  ): Promise<Set<string>> {
    return this.rbacRepository.getUserPermissionKeys(data);
  }

  async getRolesByTenantAndScope(
    queryDto: GetRolesRequestDto,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<GetRolesResponseDto[]> {
    return this.rbacRepository.getRolesByTenantAndScope({
      queryDto,
      effectiveTenant,
      includeSystemRoles: getUserScope(user) === UserScopeTypeEnums.ORGANIZATION,
    });
  }

  async getPermissionsByTenant(
    queryDto: GetPermissionsByTenantRequestDto,
    effectiveTenant: EffectiveTenant,
  ): Promise<GetPermissionsByTenantResponseDto> {
    const permissions = await this.rbacRepository.getPermissionsByTenant({
      queryDto,
      effectiveTenant,
    });
    return { permissions };
  }
}
