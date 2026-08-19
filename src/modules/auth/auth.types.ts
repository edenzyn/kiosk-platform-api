import { ClientTypeEnum } from "../../shared/enums/core/client-type.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { TwoFactorMethodEnums } from "../../shared/enums/user/two-factor-method.enum";
import type { DeviceEntity } from "../device/device.schema";
import type { LicenseEntity } from "../license/schemas/license.schema";
import type { UserScope } from "../user/dtos/check-auth.dtos";
import type { UserSettingsEntity } from "../user/schemas/user-settings.schema";
import type { UserEntity } from "../user/schemas/user.schema";
import type { OrganizationEntity } from "../organization/organization.schema";
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
  settings: UserSettingsEntity;
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
  settings: UserSettingsEntity;
}

export interface LoginResellerServiceInput {
  email: string;
  password: string;
}

export interface LoginResellerServiceResult {
  clientType: ClientTypeEnum.USER_CLIENT;
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
  permissions: UserPermissions[];
  settings: UserSettingsEntity;
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

export interface AcceptResellerInvitationServiceInput {
  token: string;
  name: string;
  password: string;
}

export type AcceptResellerInvitationServiceResult = LoginServiceResult;

export interface AcceptOrganizationInvitationServiceInput {
  token: string;
  name: string;
  password: string;
  registeredName: string;
  registrationNumber: string;
}

export type AcceptOrganizationInvitationServiceResult = LoginServiceResult & {
  organization: OrganizationEntity;
};

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

export interface RequiresTwoFactorServiceResult {
  requiresTwoFactor: true;
  twoFactorToken: string;
  method: TwoFactorMethodEnums;
}

export interface VerifyTwoFactorLoginServiceInput {
  twoFactorToken: string;
  code: string;
}

export type VerifyTwoFactorLoginServiceResult =
  | LoginServiceResult
  | LoginPlatformUserServiceResult
  | LoginResellerServiceResult;

// ========================================
// ? TWO-FACTOR TOKEN PURPOSES
// ========================================
export enum TwoFactorTokenPurposeEnums {
  OTP_SETUP = 1,
  OTP_LOGIN = 2,
  TOTP_SETUP = 3,
  PENDING_LOGIN = 4,
}

export interface TwoFactorOtpTokenPayload {
  purpose: TwoFactorTokenPurposeEnums.OTP_SETUP | TwoFactorTokenPurposeEnums.OTP_LOGIN;
  userId: string;
  method: TwoFactorMethodEnums;
  codeHash: string;
}

export interface TwoFactorTotpSetupTokenPayload {
  purpose: TwoFactorTokenPurposeEnums.TOTP_SETUP;
  userId: string;
  secret: string;
}

export interface TwoFactorPendingLoginTokenPayload {
  purpose: TwoFactorTokenPurposeEnums.PENDING_LOGIN;
  userId: string;
}

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

export interface DeleteExpiredRefreshTokensRepoInput {
  now?: Date;
}
export type DeleteExpiredRefreshTokensRepoResult = number;
