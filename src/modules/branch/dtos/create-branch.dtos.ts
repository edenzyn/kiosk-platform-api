import type { BranchEntity } from "../branch.schema";

export interface CreateBranchRequestDto {
  organizationId: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  area?: string | null;
  landmark?: string | null;
  address: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  createdBy: string;
}

export interface CreateBranchResponseDto {
  branch: BranchEntity;
}
