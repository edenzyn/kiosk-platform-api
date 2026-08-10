import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";

export interface CreateDeviceBodyDto {
  branchId: string;
  name: string;
  pin: number;
  deviceType: DeviceTypeEnum;
}

export interface CreateDeviceRequestDto {
  organizationId: string;
  branchId: string;
  deviceCode: string;
  name: string;
  pin: string;
  deviceType: DeviceTypeEnum;
  createdBy: string;
}
