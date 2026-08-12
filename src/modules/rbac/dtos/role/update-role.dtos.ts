export interface UpdateRoleRequestDto {
  roleId: string;
  name?: string;
  description?: string;
  rank?: number;
  updatedBy?: string;
}

export interface UpdateRoleResponseDto {
  success: boolean;
}
