import type { BranchEntity } from "../branch.schema";

export interface GetBranchesResponseDto {
  branches: BranchEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
