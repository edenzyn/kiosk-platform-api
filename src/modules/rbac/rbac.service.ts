import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { UserRepository } from "../user/user.repository";
import type { AssignPermissionRequestDto } from "./dtos/assign-permission-request.dto";
import type { AssignPermissionResponseDto } from "./dtos/assign-permission-response.dto";
import type { CreateRoleRequestDto } from "./dtos/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/create-user-role-mapper-request.dto";
import type { GetPermissionsByTenantRequestDto } from "./dtos/get-permissions-by-tenant-request.dto";
import type { GetPermissionsByTenantResponseDto } from "./dtos/get-permissions-by-tenant-response.dto";
import type { GetRolesRequestDto } from "./dtos/get-roles-request.dto";
import type { GetRolesResponseDto } from "./dtos/get-roles-response.dto";
import type { GetUserPermissionsRequestDto } from "./dtos/get-user-permissions-request.dto";
import type { RemovePermissionRequestDto } from "./dtos/remove-permission-request.dto";
import type { RemovePermissionResponseDto } from "./dtos/remove-permission-response.dto";
import type { RbacRepository } from "./rbac.repository";

export class RbacService {
  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createRole(
    data: Omit<CreateRoleRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createRole({ ...data, createdBy: user.id });
  }

  async assignPermission(
    data: Omit<AssignPermissionRequestDto, "createdBy">,
    user: UserTokenDto,
  ): Promise<AssignPermissionResponseDto> {
    const existing = await this.rbacRepository.getPermissionMapper(
      data.permissionId,
      data.entityType,
      data.entityId,
    );

    if (existing) {
      const mapper = await this.rbacRepository.updatePermissionMapperStatus(
        existing.id,
        true,
        user.id,
      );
      return { mapper };
    }

    let organizationId: string | null = user.organizationId || null;
    let branchId: string | null = user?.branchId || null;

    if (data.entityType === PermissionEntityType.ROLE) {
      const role = await this.rbacRepository.getRoleById(data.entityId);
      if (role) {
        organizationId = role.organizationId || organizationId;
        branchId = role.branchId || branchId;
      }
    } else if (data.entityType === PermissionEntityType.USER) {
      const targetUser = await this.userRepository.findById(data.entityId);
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
    const existing = await this.rbacRepository.getPermissionMapper(
      data.permissionId,
      data.entityType,
      data.entityId,
    );

    if (!existing) {
      throw new AppError("Permission mapping not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const mapper = await this.rbacRepository.updatePermissionMapperStatus(
      existing.id,
      false,
      user.id,
    );

    return { mapper };
  }

  async createUserRoleMapper(
    data: Omit<CreateUserRoleMapperRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createUserRoleMapper({
      ...data,
      createdBy: user.id,
    });
  }

  async getUserPermissionKeys(
    data: GetUserPermissionsRequestDto,
  ): Promise<Set<string>> {
    return this.rbacRepository.getUserPermissionKeys(data);
  }

  async getRolesByTenant(
    queryDto: GetRolesRequestDto,
    user: UserTokenDto,
  ): Promise<GetRolesResponseDto[]> {
    return this.rbacRepository.getRolesByTenant(queryDto, user);
  }

  async getPermissionsByScopeAndTenant(
    queryDto: GetPermissionsByTenantRequestDto,
    user: UserTokenDto,
  ): Promise<GetPermissionsByTenantResponseDto> {
    const permissions =
      await this.rbacRepository.getPermissionsByScopeAndTenant(queryDto, user);
    return { permissions };
  }
}
