import { ClientTypeEnum } from "../../shared/enums/core/client-type.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import type { OtpTypeEnum } from "../../shared/enums/otp/otp-type.enum";
import type { TwoFactorMethodEnums } from "../../shared/enums/user/two-factor-method.enum";
import type { OtpEntity } from "./schemas/otp.schema";
import type { DeviceEntity } from "../device/device.schema";
import type { LicenseEntity } from "../license/schemas/license.schema";
import type { UserScope } from "../user/dtos/check-auth.dtos";
import type { UserSettingsEntity } from "../user/schemas/user-settings.schema";
import type { UserEntity } from "../user/schemas/user.schema";
import type { OrganizationEntity } from "../organization/organization.schema";
import type {
  AuthSessionEntity,
  CreateAuthSessionEntity,
} from "./schemas/auth-session.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

export interface LoginServiceInput {
  email: string;
  password: string;
  meta: SessionMeta;
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
  meta: SessionMeta;
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
  meta: SessionMeta;
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
  meta: SessionMeta;
}

export type AcceptInvitationServiceResult = LoginServiceResult;

export interface AcceptResellerInvitationServiceInput {
  token: string;
  name: string;
  password: string;
  meta: SessionMeta;
}

export type AcceptResellerInvitationServiceResult = LoginServiceResult;

export interface AcceptOrganizationInvitationServiceInput {
  token: string;
  name: string;
  password: string;
  registeredName: string;
  registrationNumber: string;
  meta: SessionMeta;
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
  verificationId: string;
  method: TwoFactorMethodEnums;
}

export interface VerifyTwoFactorLoginServiceInput {
  verificationId: string;
  code: string;
  meta: SessionMeta;
}

export type VerifyTwoFactorLoginServiceResult =
  | LoginServiceResult
  | LoginPlatformUserServiceResult
  | LoginResellerServiceResult;

// ========================================
// ? TWO-FACTOR TOKEN PURPOSES
// ========================================

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface CreateRefreshTokenRepoInput {
  data: CreateAuthSessionEntity;
}
export type CreateRefreshTokenRepoResult = void;

export interface RotateRefreshTokenRepoInput {
  sessionId: string;
  currentTokenHash: string;
  newTokenHash: string;
  newExpiresAt: Date;
}
export type RotateRefreshTokenRepoResult = boolean;

export interface RevokeRefreshTokenRepoInput {
  tokenId: string;
  tokenHash: string;
}
export type RevokeRefreshTokenRepoResult = void;

export interface RemoveAuthSessionsRepoInput {
  now?: Date;
}
export type RemoveAuthSessionsRepoResult = number;

export interface ListSessionsRepoInput {
  userId: string;
}
export type ListSessionsRepoResult = AuthSessionEntity[];

export interface RevokeSessionRepoInput {
  userId: string;
  sessionId: string;
}
export type RevokeSessionRepoResult = boolean;

export interface RevokeOtherSessionsRepoInput {
  userId: string;
  keepSessionId: string;
}
export type RevokeOtherSessionsRepoResult = number;

export interface RevokeOldestSessionsRepoInput {
  userId: string;
  count: number;
}
export type RevokeOldestSessionsRepoResult = void;

// ========================================
// ? SESSIONS (SERVICE)
// ========================================
export interface SessionDto {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface ListMySessionsServiceInput {
  userId: string;
  currentSessionId?: string;
}
export interface ListMySessionsServiceResult {
  sessions: SessionDto[];
}

export interface RevokeSessionServiceInput {
  userId: string;
  sessionId: string;
}
export type RevokeSessionServiceResult = boolean;

export interface RevokeOtherSessionsServiceInput {
  userId: string;
  currentSessionId: string;
}
export type RevokeOtherSessionsServiceResult = number;

// ========================================
// ? OTP
// ========================================
// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface IssueOtpServiceInput {
  userId: string;
  type: OtpTypeEnum;
  channel: NotificationChannelEnum;
  destination: string;
}
export interface IssueOtpServiceResult {
  /** Opaque id the client echoes back when verifying. */
  verificationId: string;
  /** Plaintext code — only ever handed to the delivery channel, never stored. */
  code: string;
  /** Further codes this user may request for this type in the current window. */
  resendsRemaining: number;
}

export interface VerifyOtpServiceInput {
  verificationId: string;
  type: OtpTypeEnum;
  code: string;
  /**
   * Optional defence-in-depth filter. Omitted by the 2FA login flow, where the
   * caller has no authenticated user yet and the (unguessable) verificationId
   * is itself the session handle.
   */
  userId?: string;
}
export interface VerifyOtpServiceResult {
  /** Owner of the verified OTP. */
  userId: string;
  /** The value the OTP was issued against (e.g. the pending new email). */
  destination: string;
  /** Channel the code was delivered over. */
  channel: NotificationChannelEnum;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindActiveOtpRepoInput {
  id: string;
  type: OtpTypeEnum;
  userId?: string;
}
export type FindActiveOtpRepoResult = OtpEntity | undefined;

export interface CountOtpGenerationsRepoInput {
  userId: string;
  type: OtpTypeEnum;
  since: Date;
}

export interface UpdateOtpsRepoInput {
  where: {
    id?: string;
    userId?: string;
    type?: OtpTypeEnum;
    /** Restrict to rows that have not been consumed yet. */
    activeOnly?: boolean;
  };
  data: {
    consumedAt?: Date;
    /** Bumps attemptCount by one; the updated rows are returned. */
    incrementAttempt?: boolean;
  };
}
export type UpdateOtpsRepoResult = OtpEntity[];

export interface DeleteOtpsRepoInput {
  expiredBefore: Date;
}

