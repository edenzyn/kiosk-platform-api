export enum DeviceTypeEnum {
  KIOSK = 1,
  COUNTER = 2,
  KDS = 3,
  CDS = 4,
}

export const DEVICE_TYPE_SHORT_LABELS = {
  [DeviceTypeEnum.KIOSK]: "KSK",
  [DeviceTypeEnum.COUNTER]: "CTR",
  [DeviceTypeEnum.KDS]: "KDS",
  [DeviceTypeEnum.CDS]: "CDS",
};
