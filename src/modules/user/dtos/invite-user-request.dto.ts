export interface InviteUserRequestDto {
  name: string;
  email: string;
  roles?: string[];
  branchId?: string | null;
}
