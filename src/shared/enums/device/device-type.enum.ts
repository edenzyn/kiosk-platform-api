export enum DeviceTypeEnum {
  KIOSK = 1,
  COUNTER = 2,
  KDS = 3,
  DIGITAL_DISPLAY = 4,
}

export const DEVICE_TYPE_SHORT_LABELS = {
  [DeviceTypeEnum.KIOSK]: "KSK",
  [DeviceTypeEnum.COUNTER]: "CTR",
  [DeviceTypeEnum.KDS]: "KDS",
  [DeviceTypeEnum.DIGITAL_DISPLAY]: "DDS",
};
