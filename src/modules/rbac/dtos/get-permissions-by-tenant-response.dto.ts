import type { PermissionEntity } from "../schemas/permission.schema";

export type PermissionEntityWithAssigned = PermissionEntity & {
  assigned: boolean;
};

export interface GetPermissionsByTenantResponseDto {
  permissions: PermissionEntityWithAssigned[];
}
