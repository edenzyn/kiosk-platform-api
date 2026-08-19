export interface InviteOrganizationRequestDto {
  organizationName: string;
  name: string;
  email: string;
}

export interface InviteOrganizationResponseDto {
  message: string;
}
