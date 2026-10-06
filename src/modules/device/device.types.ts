import type { DeviceAdminTokenDto } from "../../shared/dtos/device-admin-token.dto";
import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { DeviceAdminAuthMethodEnum } from "../../shared/enums/device/device-admin-auth-method.enum";
import type { DeviceLogActionEnum } from "../../shared/enums/device/device-log-action.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import type { LicenseAuthResponseDto } from "../license/dtos/device-auth.dtos";
import type { DeviceEntity, DeviceWithBranchEntity } from "./device.schema";
import type { CreateDeviceRequestDto } from "./dtos/create-device.dtos";
import type { BranchBrandingDto } from "../branch/dtos/get-branch-branding.dtos";
import type { UserEntity } from "../user/schemas/user.schema";
import type { CreateDeviceLogEntity } from "./device-log.schema";
import type {
  CreateDeviceStaffSessionEntity,
  DeviceStaffSessionEntity,
} from "./device-staff-session.schema";
import type {
  DeviceAdminLoginBodyDto,
  DeviceAdminLoginResponseDto,
  MapOwnTerminalBodyDto,
  MapOwnTerminalResponseDto,
} from "./dtos/device-admin.dtos";
import type { DeviceAuthResponseDto } from "./dtos/device-auth.dtos";
import type {
  DeviceAdminStaffLoginBodyDto,
  DeviceStaffLoginBodyDto,
  DeviceStaffSessionResponseDto,
} from "./dtos/device-staff.dtos";
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

export interface VerifyDeviceUserSecretServiceInput {
  device: DeviceTokenDto;
  /** Email or mobile number; used when the person is not known yet. */
  identity?: string;
  /** The staff member already signed in on the device. */
  userId?: string;
  method: DeviceAdminAuthMethodEnum;
  secret: string;
  attemptsKey: string;
  failedAction: DeviceLogActionEnum;
}

export interface IssueDeviceAdminSessionServiceInput {
  device: DeviceTokenDto;
  user: UserEntity;
}

export interface DeviceAdminStaffLoginServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  dto: DeviceAdminStaffLoginBodyDto;
}

export interface GenerateDeviceStaffTokensServiceInput {
  deviceStaff: DeviceStaffTokenDto;
  sessionExpiresAt: Date;
}
export interface GenerateDeviceStaffTokensServiceResult {
  staffToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}

export interface DeviceStaffLoginServiceInput {
  device: DeviceTokenDto;
  dto: DeviceStaffLoginBodyDto;
}
export interface DeviceStaffSessionServiceResult extends DeviceStaffSessionResponseDto {
  refreshToken: string;
}

export interface RefreshDeviceStaffSessionServiceInput {
  device: DeviceTokenDto;
  refreshToken: string;
}

export interface DeviceStaffLogoutServiceInput {
  device: DeviceTokenDto;
  refreshToken: string;
}

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

export interface CreateStaffSessionRepoInput {
  data: CreateDeviceStaffSessionEntity;
}
export type CreateStaffSessionRepoResult = DeviceStaffSessionEntity;

export interface FindActiveStaffSessionRepoInput {
  id: string;
  deviceId: string;
  tokenHash: string;
}
export type FindActiveStaffSessionRepoResult =
  DeviceStaffSessionEntity | undefined;

export interface RotateStaffSessionRepoInput {
  id: string;
  currentTokenHash: string;
  newTokenHash: string;
}

export interface EndStaffSessionsRepoInput {
  deviceId: string;
  /** Ends only this session when given, otherwise every open one on the device. */
  id?: string;
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
