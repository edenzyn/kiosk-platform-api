import type { DeviceEntity } from "../device.schema";

export interface ToggleDeviceStatusResponseDto {
  device: Omit<DeviceEntity, "pin">;
}
