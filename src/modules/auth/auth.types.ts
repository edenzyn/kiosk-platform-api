import { ClientTypeEnum } from "../../shared/enums/core/client-type.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { DeviceEntity } from "../device/device.schema";
import type { LicenseEntity } from "../license/schemas/license.schema";
import type { UserScope } from "../user/dtos/check-auth.dtos";
import type { UserEntity } from "../user/schemas/user.schema";
import type { CreateRefreshTokenEntity } from "./schemas/refresh-token.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginServiceInput {
  email: string;
  password: string;
}

export interface LoginServiceResult {
  clientType: ClientTypeEnum.USER_CLIENT;
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
  permissions: UserPermissions[];
  availableScopes: UserScope[];
}

export interface LoginPlatformUserServiceInput {
  email: string;
  password: string;
}

export interface LoginPlatformUserServiceResult {
  clientType: ClientTypeEnum.USER_CLIENT;
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
  permissions: UserPermissions[];
}

export interface LoginDeviceServiceInput {
  deviceCode: string;
  pin: string;
}

export interface LoginDeviceServiceResult {
  clientType: ClientTypeEnum.DEVICE_CLIENT;
  device: Omit<DeviceEntity, "pin">;
  tokens: AuthTokens;
  license: Omit<LicenseEntity, "createdBy" | "updatedBy" | "licenseKey" | "licenseKeyHash"> | null;
}

export interface AcceptInvitationServiceInput {
  token: string;
  name: string;
  password: string;
}

export type AcceptInvitationServiceResult = LoginServiceResult;

export interface RefreshTokenServiceInput {
  refreshToken: string;
}

export type RefreshTokenServiceResult =
  | LoginServiceResult
  | LoginDeviceServiceResult;

export interface LogoutServiceInput {
  refreshToken: string;
}

export type LogoutServiceResult = boolean;

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface CreateRefreshTokenRepoInput {
  data: CreateRefreshTokenEntity;
}
export type CreateRefreshTokenRepoResult = void;

export interface RotateRefreshTokenRepoInput {
  currentTokenId: string;
  currentTokenHash: string;
  replacement: CreateRefreshTokenEntity;
}
export type RotateRefreshTokenRepoResult = boolean;

export interface RevokeRefreshTokenRepoInput {
  tokenId: string;
  tokenHash: string;
}
export type RevokeRefreshTokenRepoResult = void;
