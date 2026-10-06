import type { DeviceAdminAuthMethodEnum } from "../../../shared/enums/device/device-admin-auth-method.enum";

export interface DeviceStaffLoginBodyDto {
  identity: string;
  method: DeviceAdminAuthMethodEnum;
  secret: string;
}

export interface DeviceStaffSessionResponseDto {
  staffToken: string;
  expiresInSeconds: number;
  sessionExpiresAt: Date;
  staff: {
    id: string;
    name: string;
  };
}

export interface DeviceAdminStaffLoginBodyDto {
  method: DeviceAdminAuthMethodEnum;
  secret: string;
}
