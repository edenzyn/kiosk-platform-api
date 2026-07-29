import type { BranchEntity } from "./branch.schema";

// --- Create ---
export interface CreateBranchRequestDto {
  organizationId: string;
  name: string;
  address?: string | null;
  createdBy: string;
}

export interface CreateBranchResponseDto {
  branch: BranchEntity;
}

// --- List ---
export interface ListBranchRequestDto {
  organizationId?: string;
  branchIds?: string[];
}

export interface ListBranchResponseDto {
  branches: BranchEntity[];
}


