export interface InviteUserRequestDto {
  name: string;
  email: string;
  roles?: string[];
  branchId?: string | null;
}

export interface InviteUserResponseDto {
  message: string;
}
