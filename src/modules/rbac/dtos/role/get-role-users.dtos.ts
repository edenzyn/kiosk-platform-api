import type { UserResponseDto } from "../../../user/dtos/get-users.dtos";

export interface GetRoleUsersRequestDto {
  roleId: string;
}

export interface GetRoleUsersResponseDto {
  users: UserResponseDto[];
}
