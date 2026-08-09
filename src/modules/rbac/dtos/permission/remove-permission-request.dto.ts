import { PermissionEntityType } from "../../../../shared/enums/rbac/permission-entity-type.enum";

export interface RemovePermissionRequestDto {
  permissionId: string;
  entityType: PermissionEntityType;
  entityId: string;
  updatedBy: string;
}
