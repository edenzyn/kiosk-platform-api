export type GetRolesResponseDto = {
  id: string;
  organizationId: string | null;
  branchId: string | null;
  name: string | null;
  description: string | null;
  rank: number;
  isSystem: boolean;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  memberCount: number;
};

export interface GetRolesRequestDto {
  search?: string;
  sys?: boolean;
  branchId?: string | null;
}
