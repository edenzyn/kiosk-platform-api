import { DeviceTypeEnum } from "../enums/device/device-type.enum";

export interface DeviceTokenDto {
  id: string;
  organizationId: string;
  branchId: string;
  type: DeviceTypeEnum;
  deviceCode: string;
}
