import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import type { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import type { UserScope } from "./dtos/check-auth.dtos";
import type { UserResponseDto } from "./dtos/get-users.dtos";
import type {
  CreateUserInvitationEntity,
  UserInvitationEntity,
} from "./schemas/user-invitations.schema";
import type { CreateUserEntity, UserEntity } from "./schemas/user.schema";
import type { UserSettingsEntity } from "./schemas/user-settings.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================

export interface GetPermissionsAndScopesServiceInput {
  userId: string;
  organizationId: string | null;
  branchId: string | null;
  userScope: UserScopeTypeEnums;
}

export interface GetPermissionsAndScopesServiceResult {
  permissions: UserPermissions[];
  availableScopes: UserScope[];
}

export interface GetUsersServiceInput {
  effectiveTenant: EffectiveTenant;
  query: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: any;
  };
}

export interface GetUsersServiceResult {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InviteUserServiceInput {
  effectiveTenant: EffectiveTenant;
  dto: {
    name: string;
    email: string;
    roles?: string[];
    branchId?: string | null;
  };
  currentUser: UserTokenDto;
}

export interface InviteUserServiceResult {
  message: string;
}

export interface GetInvitationsByTenantServiceInput {
  effectiveTenant: EffectiveTenant;
  query: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: any;
    status?: number;
    expiresStart?: Date;
    expiresEnd?: Date;
  };
}

export interface GetInvitationsByTenantServiceResult {
  invitations: UserInvitationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResendInvitationServiceInput {
  id: string;
  currentUser: UserTokenDto;
}

export type ResendInvitationServiceResult = UserInvitationEntity;

export interface RevokeInvitationServiceInput {
  id: string;
  currentUser: UserTokenDto;
}

export interface RevokeInvitationServiceResult {
  message: string;
  success: boolean;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOneUserRepoInput {
  id?: string;
  email?: string;
  mobile?: string;
  organizationId?: string | null;
  branchId?: string | null;
  userType?: number;
  isActive?: boolean;
}
export type FindOneUserRepoResult = UserEntity | undefined;

export interface FindUserByTenantRepoInput {
  organizationId?: string;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindUserByTenantRepoResult {
  users: UserResponseDto[];
  total: number;
}

export interface FindUsersByRoleIdRepoInput {
  roleId: string;
  organizationId?: string;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
  ru?: boolean;
}
export interface FindUsersByRoleIdRepoResult {
  users: Omit<UserEntity, "password" | "createdBy" | "updatedBy">[];
  total: number;
}

export interface FindResellersRepoInput {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindResellersRepoResult {
  resellers: Pick<
    UserEntity,
    "id" | "name" | "email" | "mobile" | "isActive" | "createdAt"
  >[];
  total: number;
}

export interface UpdateUserRepoInput {
  userId: string;
  data: Partial<
    Pick<
      UserEntity,
      "isActive" | "updatedBy" | "password" | "name" | "email" | "mobile"
    >
  >;
}
export type UpdateUserRepoResult = UserEntity;

// ========================================
// ? PROFILE CONTACT CHANGE (EMAIL / MOBILE)
// ========================================
export enum ContactChangeTokenPurposeEnums {
  EMAIL_CHANGE = 1,
  MOBILE_CHANGE = 2,
}

export interface ContactChangeTokenPayload {
  purpose: ContactChangeTokenPurposeEnums;
  userId: string;
  newValue: string;
  codeHash: string;
}

export interface CreateUserRepoInput {
  user: CreateUserEntity;
}
export type CreateUserRepoResult = UserEntity;

export interface FindOneInvitationRepoInput {
  id?: string;
  email?: string;
  token?: string;
  status?: UserInvitationStatusEnum;
  organizationId?: string | null;
  branchId?: string | null;
}
export type FindOneInvitationRepoResult = UserInvitationEntity | undefined;

export interface FindInvitationsByTenantRepoInput {
  organizationId?: string;
  branchId?: string;
  entityType?: UserTypeEnums;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
  status?: UserInvitationStatusEnum;
  expiresStart?: Date;
  expiresEnd?: Date;
}
export interface FindInvitationsByTenantRepoResult {
  invitations: UserInvitationEntity[];
  total: number;
}

export interface CreateUserInvitationRepoInput {
  invitation: CreateUserInvitationEntity;
}
export type CreateUserInvitationRepoResult = UserInvitationEntity;

// ========================================
// ? USER SETTINGS SCHEMA METHODS
// ========================================
export interface UpdateUserSettingsRepoInput {
  userId: string;
  data: Partial<
    Pick<
      UserSettingsEntity,
      "themeMode" | "primaryColor" | "languageCode" | "timezone"
    >
  >;
}
export type UpdateUserSettingsRepoResult = UserSettingsEntity;

export interface UpdateUserInvitationRepoInput {
  id: string;
  data: {
    name?: string;
    email?: string;
    token?: string;
    status?: UserInvitationStatusEnum;
    expiresAt?: Date;
    roleIds?: string[];
    branchId?: string | null;
    updatedBy?: string | null;
  };
}
export type UpdateUserInvitationRepoResult = UserInvitationEntity | undefined;

// ========================================
// ? USER TWO-FACTOR AUTH FIELDS (on user_settings)
// ========================================
export interface UpdateTwoFactorAuthRepoInput {
  userId: string;
  data: Partial<
    Pick<UserSettingsEntity, "twoFactorEnabled" | "twoFactorMethod">
  >;
}
export type UpdateTwoFactorAuthRepoResult = UserSettingsEntity;
