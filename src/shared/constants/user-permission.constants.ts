import { UserPermissions } from "../enums/rbac/user-permission.enum";

export const ORGANIZATION_TOP_ROLES = [
  UserPermissions.ORGANIZATION_ALL_WRITE,
  UserPermissions.ORGANIZATION_ALL_READ,
];

export const BRANCH_TOP_SCOPED_ROLES = [
  UserPermissions.BRANCH_ALL_READ,
  UserPermissions.BRANCH_ALL_WRITE,
];

export const ORG_BRANCH_TOP_SCOPED_READ_ROLES = [
  UserPermissions.ORGANIZATION_ALL_READ,
  UserPermissions.BRANCH_ALL_READ,
];

export const ORG_BRANCH_TOP_SCOPED_WRITE_ROLES = [
  UserPermissions.ORGANIZATION_ALL_WRITE,
  UserPermissions.BRANCH_ALL_WRITE,
];

export const ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_ROLES = [
  ...ORG_BRANCH_TOP_SCOPED_READ_ROLES,
  ...ORG_BRANCH_TOP_SCOPED_WRITE_ROLES,
];
