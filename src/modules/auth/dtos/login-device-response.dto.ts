import type { DeviceEntity } from "../../device/device.schema";

export interface LoginDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
}

export interface LoginDeviceResult {
  device: Omit<DeviceEntity, "pin">;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
