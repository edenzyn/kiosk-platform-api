import type { RoleEntity } from "../../schemas/role.schema";

export interface ToggleRoleStatusRequestDto {
  roleId: string;
}

export interface ToggleRoleStatusResponseDto {
  role: RoleEntity;
}
