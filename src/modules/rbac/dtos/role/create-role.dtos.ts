import type { RoleEntity } from "../../schemas/role.schema";

export interface CreateRoleRequestDto {
  organizationId?: string | null;
  branchId?: string | null;
  name: string;
  description?: string | null;
  rank: number;
  permissions?: string[];
  isSystem?: boolean;
  createdBy?: string;
}

export interface CreateRoleResponseDto {
  role: RoleEntity;
}
