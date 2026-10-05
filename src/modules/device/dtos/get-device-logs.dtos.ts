import type { DeviceLogActionEnum } from "../../../shared/enums/device/device-log-action.enum";

export interface GetDeviceLogsQueryDto {
  page?: number;
  limit?: number;
}

export interface DeviceLogDto {
  id: string;
  action: DeviceLogActionEnum;
  /** Null when the device did it itself. */
  performedBy: { id: string; name: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface GetDeviceLogsResponseDto {
  logs: DeviceLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
