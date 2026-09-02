import type { BranchEntity } from "../schemas/branch.schema";

export interface GetBranchesRequestDto {
  organizationId?: string;
  branchIds?: string[];
  page?: number;
  limit?: number;
}

export interface GetBranchesResponseDto {
  branches: BranchEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
