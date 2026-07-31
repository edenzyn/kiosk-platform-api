import type { PermissionEntity } from "../schemas/permission.schema";

export interface CreatePermissionResponseDto {
  permission: PermissionEntity;
}
