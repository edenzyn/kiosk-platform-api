import { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";
import type { PermissionEntity } from "../schemas/permission.schema";

export type PermissionEntityWithAssigned = PermissionEntity & {
  assigned: boolean; // True when the permission is assigned to the entity
  assignedVia: PermissionEntityType | null; // The entity_type from permission_mapper that holds the assignment (1=user, 2=role), or null if not assigned
  isReadOnly: boolean; // True when the permission is assigned but via a different entity type (e.g. inherited via role while querying a user)
};

export interface GetPermissionsByTenantResponseDto {
  permissions: PermissionEntityWithAssigned[];
}
