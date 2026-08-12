export interface RemoveUserFromRoleRequestDto {
  roleId: string;
  userId: string;
}

export interface RemoveUserFromRoleResponseDto {
  success: boolean;
}
