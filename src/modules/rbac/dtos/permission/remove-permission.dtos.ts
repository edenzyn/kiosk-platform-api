import { PermissionEntityType } from "../../../../shared/enums/rbac/permission-entity-type.enum";
import type { PermissionMapperEntity } from "../../schemas/permission-mapper.schema";

export interface RemovePermissionRequestDto {
  permissionId: string;
  entityType: PermissionEntityType;
  entityId: string;
  updatedBy: string;
}

export interface RemovePermissionResponseDto {
  mapper: PermissionMapperEntity;
}
