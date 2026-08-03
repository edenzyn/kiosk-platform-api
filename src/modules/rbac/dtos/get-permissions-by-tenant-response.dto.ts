import type { PermissionEntity } from "../schemas/permission.schema";

export interface GetPermissionsByTenantResponseDto {
  permissions: PermissionEntity[];
}
