export interface GetBranchesRequestDto {
  organizationId?: string;
  branchIds?: string[];
  page?: number;
  limit?: number;
}
