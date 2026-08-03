import { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../../shared/enums/rbac/permission-scope.enum";

export interface AssignPermissionRequestDto {
  permissionId: string;
  entityType: PermissionEntityType;
  entityId: string;
  scope?: PermissionScope | null;
  createdBy: string;
}
