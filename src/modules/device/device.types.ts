import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import type { LicenseEntity } from "../license/schemas/license.schema";
import type { DeviceEntity, DeviceWithBranchEntity } from "./device.schema";
import type { CreateDeviceRequestDto } from "./dtos/create-device.dtos";

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

export interface GetDevicesServiceResult {
  devices: DeviceWithBranchEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateDeviceServiceInput {
  data: {
    id: string;
    branchId?: string;
    deviceCode?: string | null;
    name?: string | null;
    pin?: number | null;
    deviceType?: DeviceTypeEnum | null;
  };
  user: UserTokenDto;
}

export type UpdateDeviceServiceResult = Omit<DeviceEntity, "pin">;

export interface ToggleDeviceStatusServiceInput {
  id: string;
  user: UserTokenDto;
}

export type ToggleDeviceStatusServiceResult = Omit<DeviceEntity, "pin">;

export interface DeviceAuthCheckServiceInput {
  id: string;
}

export interface DeviceAuthCheckServiceResult {
  device: Omit<DeviceEntity, "pin">;
  license: Omit<
    LicenseEntity,
    "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"
  > | null;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface CreateDeviceRepoInput {
  data: CreateDeviceRequestDto;
}
export type CreateDeviceRepoResult = Omit<DeviceEntity, "pin">;

export interface GetDevicesRepoInput {
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
export interface GetDevicesRepoResult {
  devices: DeviceWithBranchEntity[];
  total: number;
}

export interface FindDeviceByIdRepoInput {
  id: string;
}
export type FindDeviceByIdRepoResult = DeviceEntity | null;

export interface FindDeviceByDeviceCodeRepoInput {
  deviceCode: string;
}
export type FindDeviceByDeviceCodeRepoResult = DeviceEntity | null;

export interface UpdateDeviceRepoInput {
  id: string;
  data: Partial<DeviceEntity>;
}
export type UpdateDeviceRepoResult = Omit<DeviceEntity, "pin">;
