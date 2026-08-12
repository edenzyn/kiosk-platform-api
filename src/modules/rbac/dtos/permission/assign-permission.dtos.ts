import { PermissionEntityType } from "../../../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../../../shared/enums/rbac/permission-scope.enum";
import type { PermissionMapperEntity } from "../../schemas/permission-mapper.schema";

export interface AssignPermissionRequestDto {
  permissionId: string;
  entityType: PermissionEntityType;
  entityId: string;
  scope?: PermissionScope | null;
  createdBy: string;
}

export interface AssignPermissionResponseDto {
  mapper: PermissionMapperEntity;
}
