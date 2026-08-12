import { ClientTypeEnum } from "../../../shared/enums/core/client-type.enum";
import type { DeviceEntity } from "../../device/device.schema";
import type { LicenseEntity } from "../../license/schemas/license.schema";

export interface LoginDeviceResponseDto {
  device: Omit<DeviceEntity, "pin">;
  license: Omit<LicenseEntity, "createdBy" | "updatedBy"> | null;
}

export interface LoginDeviceResult {
  clientType: ClientTypeEnum.DEVICE_CLIENT;
  device: Omit<DeviceEntity, "pin">;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  license: Omit<LicenseEntity, "createdBy" | "updatedBy"> | null;
}

