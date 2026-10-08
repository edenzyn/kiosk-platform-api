import type { DeviceListItemDto } from "./get-devices.dtos";

export interface DeviceSessionDto {
  id: string;
  /** Browser and platform the device signed in from, e.g. "Chrome (Android)". */
  deviceName: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface DeviceStaffSessionDto {
  id: string;
  staff: {
    id: string;
    name: string;
  };
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface GetDeviceDetailsResponseDto {
  device: DeviceListItemDto;
  /** The device's active sign-in (the most recently used one); null when signed out. */
  session: DeviceSessionDto | null;
  /** The staff member signed in on the device; null when nobody is. */
  staffSession: DeviceStaffSessionDto | null;
}
