import type { DeviceEntity } from "../device.schema";

export interface UpdateDeviceBodyDto {
  id: string;
  branchId?: string;
  deviceCode?: string | null;
  name?: string | null;
  pin?: number | null;
}

export interface UpdateDeviceRequestDto {
  id: string;
  organizationId: string;
  branchId?: string;
  deviceCode?: string | null;
  name?: string | null;
  pin?: string | null;
  updatedBy: string;
}

export interface UpdateDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
}
