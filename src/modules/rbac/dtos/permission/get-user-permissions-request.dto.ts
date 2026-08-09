export interface GetUserPermissionsRequestDto {
  userId: string;
  organizationId?: string | null;
  branchId?: string | null;
}
