import type {
  CreateRoleDto,
  CreatePermissionDto,
  CreatePermissionMapperDto,
  CreateUserRoleMapperDto,
} from "./rbac.types";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { RbacRepository } from "./rbac.repository";

export class RbacService {
  constructor(private readonly rbacRepository: RbacRepository) {}

  async createRole(data: Omit<CreateRoleDto, "createdBy">, user: UserTokenDto) {
    return this.rbacRepository.createRole({ ...data, createdBy: user.id });
  }

  async createPermission(data: Omit<CreatePermissionDto, "createdBy">, user: UserTokenDto) {
    return this.rbacRepository.createPermission({
      ...data,
      createdBy: user.id,
    });
  }

  async createPermissionMapper(
    data: Omit<CreatePermissionMapperDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createPermissionMapper({
      ...data,
      createdBy: user.id,
    });
  }

  async createUserRoleMapper(
    data: Omit<CreateUserRoleMapperDto, "createdBy">,
    user: UserTokenDto,
  ) {
    return this.rbacRepository.createUserRoleMapper({
      ...data,
      createdBy: user.id,
    });
  }
}
