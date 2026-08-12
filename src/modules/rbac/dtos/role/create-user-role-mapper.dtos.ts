import type { UserRoleMapperEntity } from "../../schemas/user-roles-mapper.schema";

export interface CreateUserRoleMapperRequestDto {
  userId: string;
  roleId: string;
  createdBy: string;
}

export interface CreateUserRoleMapperResponseDto {
  mapper: UserRoleMapperEntity;
}
