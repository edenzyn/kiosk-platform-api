export interface InviteOrganizationRequestDto {
  organizationName: string;
  name: string;
  email: string;
  marketIds: string[];
}

export interface InviteOrganizationResponseDto {
  message: string;
}
