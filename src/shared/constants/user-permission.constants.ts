import { UserPermissions } from "../enums/rbac/user-permission.enum";

export const ORGANIZATION_TOP_ROLES = [
  UserPermissions.ORGANIZATION_WRITE,
  UserPermissions.ORGANIZATION_READ,
];

export const BRANCH_TOP_ROLES = [
  UserPermissions.BRANCH_WRITE,
  UserPermissions.BRANCH_READ,
];

export const ORG_BRANCH_TOP_WRITE_ROLES = [
  UserPermissions.ORGANIZATION_WRITE,
  UserPermissions.BRANCH_WRITE,
];
