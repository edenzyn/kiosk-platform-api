import type { BranchEntity } from "../schemas/branch.schema";

export interface UpdateBranchRequestDto {
  id: string;
  name?: string;
  email?: string | null;
  mobile?: string | null;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  area?: string | null;
  landmark?: string | null;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateBranchResponseDto {
  branch: BranchEntity;
}
