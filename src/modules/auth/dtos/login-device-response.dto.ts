import { ClientTypeEnum } from "../../../shared/enums/core/client-type.enum";
import type { DeviceEntity } from "../../device/device.schema";

export interface LoginDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
}

export interface LoginDeviceResult {
  clientType: ClientTypeEnum.DEVICE_CLIENT;
  device: Omit<DeviceEntity, "pin">;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
