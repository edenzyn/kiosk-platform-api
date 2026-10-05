import type { DeviceAdminTokenDto } from "../../shared/dtos/device-admin-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import type { LicenseAuthResponseDto } from "../license/dtos/device-auth.dtos";
import type { DeviceEntity, DeviceWithBranchEntity } from "./device.schema";
import type { CreateDeviceRequestDto } from "./dtos/create-device.dtos";
import type { BranchBrandingDto } from "../branch/dtos/get-branch-branding.dtos";
import type { CreateDeviceLogEntity } from "./device-log.schema";
import type {
  DeviceAdminLoginBodyDto,
  DeviceAdminLoginResponseDto,
  MapOwnTerminalBodyDto,
  MapOwnTerminalResponseDto,
} from "./dtos/device-admin.dtos";
import type { DeviceAuthResponseDto } from "./dtos/device-auth.dtos";
import type {
  DeviceLogDto,
  GetDeviceLogsQueryDto,
  GetDeviceLogsResponseDto,
} from "./dtos/get-device-logs.dtos";
import type { GetDeviceDetailsResponseDto } from "./dtos/get-device-details.dtos";
import type { GetDevicesResponseDto } from "./dtos/get-devices.dtos";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface CreateDeviceServiceInput {
  data: {
    branchId: string;
    name: string;
    pin: number;
    deviceType: DeviceTypeEnum;
  };
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export type CreateDeviceServiceResult = Omit<DeviceEntity, "pin">;

export interface GetDevicesServiceInput {
  effectiveTenant: EffectiveTenant;
  filters?: {
    deviceIds?: string[];
    page?: number;
    limit?: number;
    search?: string;
    type?: number;
    branchId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: SortingOrderEnum;
  };
}

export type GetDevicesServiceResult = GetDevicesResponseDto;

export interface GetDeviceDetailsServiceInput {
  id: string;
  effectiveTenant: EffectiveTenant;
}
export type GetDeviceDetailsServiceResult = GetDeviceDetailsResponseDto;

export interface RevokeDeviceSessionServiceInput {
  id: string;
  user: UserTokenDto;
  effectiveTenant: EffectiveTenant;
}

export interface GetDeviceLogsServiceInput {
  id: string;
  effectiveTenant: EffectiveTenant;
  filters: GetDeviceLogsQueryDto;
}
export type GetDeviceLogsServiceResult = GetDeviceLogsResponseDto;

export interface DeviceAdminLoginServiceInput {
  device: DeviceTokenDto;
  dto: DeviceAdminLoginBodyDto;
}
export type DeviceAdminLoginServiceResult = DeviceAdminLoginResponseDto;

export interface MapOwnTerminalServiceInput {
  device: DeviceTokenDto;
  admin: DeviceAdminTokenDto;
  dto: MapOwnTerminalBodyDto;
}
export type MapOwnTerminalServiceResult = MapOwnTerminalResponseDto;

export interface UpdateDeviceServiceInput {
  data: {
    id: string;
    branchId?: string;
    deviceCode?: string | null;
    name?: string | null;
    pin?: number | null;
  };
  user: UserTokenDto;
}

export type UpdateDeviceServiceResult = Omit<DeviceEntity, "pin">;

export interface ToggleDeviceStatusServiceInput {
  id: string;
  user: UserTokenDto;
}

export type ToggleDeviceStatusServiceResult = Omit<DeviceEntity, "pin">;

export interface MapDeviceTerminalServiceInput {
  id: string;
  terminalId: string | null;
  user: Pick<UserTokenDto, "id">;
}

export type MapDeviceTerminalServiceResult = Omit<DeviceEntity, "pin">;

export interface DeviceAuthCheckServiceInput {
  id: string;
}

export interface DeviceAuthCheckServiceResult {
  device: DeviceAuthResponseDto;
  license: LicenseAuthResponseDto | null;
  branding: BranchBrandingDto;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneDeviceRepoInput {
  id?: string;
  deviceCode?: string;
  organizationId?: string;
  branchId?: string;
}
export type FindOneDeviceRepoResult = DeviceEntity | null;

export interface FindDevicesRepoInput {
  organizationId?: string;
  branchId?: string;
  deviceIds?: string[];
  page?: number;
  limit?: number;
  search?: string;
  deviceType?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindDevicesRepoResult {
  devices: DeviceWithBranchEntity[];
  total: number;
}

export interface CreateDeviceLogRepoInput {
  data: CreateDeviceLogEntity;
}

export interface FindDeviceLogsRepoInput {
  deviceId: string;
  page: number;
  limit: number;
}
export interface FindDeviceLogsRepoResult {
  logs: DeviceLogDto[];
  total: number;
}

export interface CreateDeviceRepoInput {
  data: CreateDeviceRequestDto;
}
export type CreateDeviceRepoResult = Omit<DeviceEntity, "pin">;

export interface UpdateDeviceRepoInput {
  id: string;
  data: Partial<DeviceEntity>;
}
export type UpdateDeviceRepoResult = Omit<DeviceEntity, "pin">;
