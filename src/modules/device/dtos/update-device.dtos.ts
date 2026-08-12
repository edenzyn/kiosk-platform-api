import type { DeviceEntity } from "../device.schema";
import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";

export interface UpdateDeviceBodyDto {
  id: string;
  branchId?: string;
  deviceCode?: string | null;
  name?: string | null;
  pin?: number | null;
  deviceType?: DeviceTypeEnum | null;
}

export interface UpdateDeviceRequestDto {
  id: string;
  organizationId: string;
  branchId?: string;
  deviceCode?: string | null;
  name?: string | null;
  pin?: string | null;
  deviceType?: DeviceTypeEnum | null;
  updatedBy: string;
}

export interface UpdateDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
}
