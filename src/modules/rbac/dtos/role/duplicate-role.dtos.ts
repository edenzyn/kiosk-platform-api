import type { RoleEntity } from "../../schemas/role.schema";

export interface DuplicateRoleRequestDto {
  roleId: string;
}

export interface DuplicateRoleResponseDto {
  role: RoleEntity;
}
