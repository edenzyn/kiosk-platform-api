import type { UserRoleMapperEntity } from "../../schemas/user-roles-mapper.schema";

export interface AssignUserToRoleRequestDto {
  roleId: string;
  userId: string;
}

export interface AssignUserToRoleResponseDto {
  mapper: UserRoleMapperEntity;
}
