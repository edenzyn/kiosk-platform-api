export interface CreateRoleRequestDto {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  rank?: number;
  permissions?: string[];
  createdBy?: string;
}
