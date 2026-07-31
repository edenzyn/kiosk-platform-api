import type { BranchEntity } from "../branch.schema";

export interface ListBranchResponseDto {
  branches: BranchEntity[];
}
