export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponseDto {
  message: string;
}
