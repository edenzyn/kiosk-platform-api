import type { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";

export interface DeviceAuthResponseDto {
  id: string;
  organizationId: string;
  branchId: string;
  deviceCode: string | null;
  name: string;
  deviceType: DeviceTypeEnum;
}
