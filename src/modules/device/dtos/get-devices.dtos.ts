import type { DeviceEntity } from "../device.schema";

export interface GetDevicesRequestDto {
  organizationId?: string;
  branchId?: string;
  deviceIds?: string[];
  page?: number;
  limit?: number;
}

export interface GetDevicesResponseDto {
  devices: Omit<DeviceEntity, "pin">[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
