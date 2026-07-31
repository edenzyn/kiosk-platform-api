export interface CreateRoleRequestDto {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  createdBy: string;
}
