import type { DeviceEntity } from "../device.schema";

export interface ToggleDeviceStatusRequestDto {
  id: string;
}

export interface ToggleDeviceStatusResponseDto {
  device: Omit<DeviceEntity, "pin">;
}
