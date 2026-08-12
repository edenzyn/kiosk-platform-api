import type { DeviceEntity } from "../../device/device.schema";
import type { LicenseEntity } from "../../license/schemas/license.schema";

export interface LoginDeviceRequestDto {
  deviceCode: string;
  pin: string;
}

export interface LoginDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
  license: Omit<LicenseEntity, "createdBy" | "updatedBy"> | null;
}
