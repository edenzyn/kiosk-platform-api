import type { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import type { DeviceAuthResponseDto } from "./dtos/device-auth.dtos";
import type { DeviceEntity } from "./device.schema";

export class DeviceMapper {
  static toDeviceAuthResponse(device: DeviceEntity): DeviceAuthResponseDto {
    return {
      id: device.id,
      organizationId: device.organizationId,
      branchId: device.branchId,
      deviceCode: device.deviceCode,
      name: device.name,
      deviceType: device.deviceType as DeviceTypeEnum,
    };
  }
}
