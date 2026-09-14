export interface InviteResellerRequestDto {
  name: string;
  email: string;
  marketIds: string[];
}

export interface InviteResellerResponseDto {
  message: string;
}
