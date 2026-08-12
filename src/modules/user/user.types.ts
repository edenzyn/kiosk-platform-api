import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { UserScopeTypeEnums } from "../../shared/enums/user/user-scope-type.enum";
import type { UserScope } from "./dtos/check-auth.dtos";
import type { UserResponseDto } from "./dtos/get-users.dtos";
import type {
  CreateUserInvitationEntity,
  UserInvitationEntity,
} from "./schemas/user-invitations.schema";
import type { CreateUserEntity, UserEntity } from "./schemas/user.schema";

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

export interface GetInvitationsServiceInput {
  effectiveTenant: EffectiveTenant;
  query: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: any;
  };
}

export interface GetInvitationsServiceResult {
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
export interface FindUserByEmailRepoInput {
  email: string;
}
export type FindUserByEmailRepoResult = UserEntity | undefined;

export interface FindUserByMobileRepoInput {
  mobile: string;
}
export type FindUserByMobileRepoResult = UserEntity | undefined;

export interface FindUserByIdRepoInput {
  id: string;
}
export type FindUserByIdRepoResult = UserEntity | undefined;

export interface CreateUserRepoInput {
  user: CreateUserEntity;
}
export type CreateUserRepoResult = UserEntity;

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

export interface CreateUserInvitationRepoInput {
  invitation: CreateUserInvitationEntity;
}
export type CreateUserInvitationRepoResult = UserInvitationEntity;

export interface FindInvitationByTokenRepoInput {
  token: string;
}
export type FindInvitationByTokenRepoResult = UserInvitationEntity | undefined;

export interface FindPendingInvitationByEmailRepoInput {
  email: string;
}
export type FindPendingInvitationByEmailRepoResult =
  | UserInvitationEntity
  | undefined;

export interface UpdateInvitationStatusRepoInput {
  id: string;
  status: number;
  updatedBy: string;
}
export type UpdateInvitationStatusRepoResult = UserInvitationEntity | undefined;

export interface FindInvitationsByTenantRepoInput {
  organizationId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindInvitationsByTenantRepoResult {
  invitations: UserInvitationEntity[];
  total: number;
}

export interface ResendInvitationRepoInput {
  id: string;
  token: string;
  expiresAt: Date;
  updatedBy: string;
}
export type ResendInvitationRepoResult = UserInvitationEntity | undefined;

export interface FindInvitationByIdRepoInput {
  id: string;
}
export type FindInvitationByIdRepoResult = UserInvitationEntity | undefined;

export interface GetUsersByRoleIdRepoInput {
  roleId: string;
  organizationId?: string;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
  ru?: boolean;
}
export interface GetUsersByRoleIdRepoResult {
  users: Pick<
    UserEntity,
    | "id"
    | "organizationId"
    | "branchId"
    | "name"
    | "email"
    | "mobile"
    | "userType"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  >[];
  total: number;
}
