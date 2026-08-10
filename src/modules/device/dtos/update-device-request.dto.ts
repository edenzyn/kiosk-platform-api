import { DeviceTypeEnum } from "../../../shared/enums/device/device-type.enum";

export interface UpdateDeviceBodyDto {
  id: string;
  branchId?: string;
  deviceCode?: string | null;
  name?: string | null;
  pin?: number | null;
  deviceType?: DeviceTypeEnum | null;
}
