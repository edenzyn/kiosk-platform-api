import type { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import type { DeviceEntity } from "../device.schema";

export interface GetDevicesRequestDto {
  organizationId?: string;
  branchId?: string;
  deviceIds?: string[];
  page?: number;
  limit?: number;
}

export interface DeviceLicenseSummaryDto {
  id: string;
  status: LicenseStatusEnum;
  planName: string;
  activatedAt: Date | null;
  expiresAt: Date | null;
}

export interface DeviceListItemDto extends Omit<DeviceEntity, "pin"> {
  branchName: string | null;
  /** The device's current license; null when none is assigned. */
  license: DeviceLicenseSummaryDto | null;
  /** Whether the device has a live socket connection right now. */
  isOnline: boolean;
}

export interface GetDevicesResponseDto {
  devices: DeviceListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
