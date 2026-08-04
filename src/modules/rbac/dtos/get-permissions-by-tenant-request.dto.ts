import type { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";

export interface GetPermissionsByTenantRequestDto {
  entityId?: string | null;
  entityType?: PermissionEntityType | null;
  isPrivilegedPermissionsIncluded?: boolean;
}
