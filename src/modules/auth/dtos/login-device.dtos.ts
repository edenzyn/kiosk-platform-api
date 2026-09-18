import type { DeviceAuthResponseDto } from "../../device/dtos/device-auth.dtos";
import type { LicenseAuthResponseDto } from "../../license/dtos/device-auth.dtos";

export interface LoginDeviceRequestDto {
  deviceCode: string;
  pin: string;
}

export interface LoginDeviceResponseDto {
  device: DeviceAuthResponseDto;
  license: LicenseAuthResponseDto | null;
}
