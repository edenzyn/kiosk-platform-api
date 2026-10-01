import type { DeviceTypeEnum } from "../../enums/device/device-type.enum";

export const DEVICE_SOCKET_NAMESPACE = "/devices";

export const RealtimeRooms = {
  device: (deviceId: string): string => `device:${deviceId}`,
  branch: (branchId: string): string => `branch:${branchId}`,
  branchDeviceType: (branchId: string, deviceType: DeviceTypeEnum): string =>
    `branch:${branchId}:type:${deviceType}`,
} as const;
