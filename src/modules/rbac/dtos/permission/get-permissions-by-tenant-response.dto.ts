import type { PermissionEntity } from "../../schemas/permission.schema";

export type PermissionEntityWithAssigned = PermissionEntity & {
  assigned: boolean; // True when the permission is assigned to the entity
  isViaRole: boolean; // True when assigned via role
  isPrivileged: boolean; // True when permission is privileged for the current scope
};

export interface GetPermissionsByTenantResponseDto {
  permissions: PermissionEntityWithAssigned[];
}
