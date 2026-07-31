import { PermissionEntityType } from "../../../shared/enums/rbac/permission-entity-type.enum";

export interface CreatePermissionMapperRequestDto {
  entityType: PermissionEntityType;
  entityId: string;
  permissionId: string;
  organizationId?: string | null;
  branchId?: string | null;
  createdBy: string;
}
