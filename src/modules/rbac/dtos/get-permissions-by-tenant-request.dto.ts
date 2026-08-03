import type { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";

export interface GetPermissionsByTenantRequestDto {
  entityId: string;
  entityType: PermissionEntityType;
}
