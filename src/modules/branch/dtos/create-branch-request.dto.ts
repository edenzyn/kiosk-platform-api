export interface CreateBranchRequestDto {
  organizationId: string;
  name: string;
  address?: string | null;
  createdBy: string;
}
