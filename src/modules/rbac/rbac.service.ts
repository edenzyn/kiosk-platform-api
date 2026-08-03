import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreatePermissionMapperRequestDto } from "./dtos/create-permission-mapper-request.dto";
import type { CreatePermissionRequestDto } from "./dtos/create-permission-request.dto";
import type { CreateRoleRequestDto } from "./dtos/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/create-user-role-mapper-request.dto";
import type { GetRolesRequestDto } from "./dtos/get-roles-request.dto";
import type { GetRolesResponseDto } from "./dtos/get-roles-response.dto";
import type { GetUserPermissionsRequestDto } from "./dtos/get-user-permissions-request.dto";
import type { RbacRepository } from "./rbac.repository";

export class RbacService {
  constructor(private readonly rbacRepository: RbacRepository) {}

  async createRole(
    data: Omit<CreateRoleRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createRole({ ...data, createdBy: user.id });
  }

  async createPermission(
    data: Omit<CreatePermissionRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createPermission({
      ...data,
      createdBy: user.id,
    });
  }

  async createPermissionMapper(
    data: Omit<CreatePermissionMapperRequestDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createPermissionMapper({
      ...data,
      createdBy: user.id,
    });
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

  async getRoles(
    queryDto: GetRolesRequestDto,
    user: UserTokenDto,
  ): Promise<GetRolesResponseDto[]> {
    return this.rbacRepository.getRoles(queryDto, user);
  }
}
