import type { PermissionEntity } from "../../schemas/permission.schema";

export interface CreatePermissionRequestDto {
  key: string;
  label?: string;
  description?: string | null;
  scope?: string;
  isPrivileged?: boolean;
  createdBy?: string;
}

export interface CreatePermissionResponseDto {
  permission: PermissionEntity;
}
