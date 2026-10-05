import type { DeviceAdminAuthMethodEnum } from "../../../shared/enums/device/device-admin-auth-method.enum";
import type { DeviceAuthResponseDto } from "./device-auth.dtos";

export interface DeviceAdminLoginBodyDto {
  identity: string;
  method: DeviceAdminAuthMethodEnum;
  secret: string;
}

export interface DeviceAdminLoginResponseDto {
  adminToken: string;
  expiresAt: Date;
  expiresInSeconds: number;
  admin: {
    id: string;
    name: string;
  };
}

export interface MapOwnTerminalBodyDto {
  terminalId: string | null;
}

export interface MapOwnTerminalResponseDto {
  device: DeviceAuthResponseDto;
}
