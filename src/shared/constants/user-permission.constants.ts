import { UserPermissions } from "../enums/rbac/user-permission.enum";

export const ORGANIZATION_TOP_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ALL_WRITE,
  UserPermissions.ORGANIZATION_ALL_READ,
];

export const BRANCH_TOP_SCOPED_PERMISSIONS = [
  UserPermissions.BRANCH_ALL_READ,
  UserPermissions.BRANCH_ALL_WRITE,
];

export const ORG_BRANCH_TOP_SCOPED_READ_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ALL_READ,
  UserPermissions.BRANCH_ALL_READ,
];

export const ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ALL_WRITE,
  UserPermissions.BRANCH_ALL_WRITE,
];

export const ORG_BRANCH_TOP_SCOPED_READ_AND_WRITE_PERMISSIONS = [
  ...ORG_BRANCH_TOP_SCOPED_READ_PERMISSIONS,
  ...ORG_BRANCH_TOP_SCOPED_WRITE_PERMISSIONS,
];

//----------------------
// User Module Constants
//----------------------
export const USER_READ_PERMISSIONS = [
  UserPermissions.ORGANIZATION_USER_READ,
  UserPermissions.BRANCH_USER_READ,
];

export const USER_CREATE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_USER_CREATE,
  UserPermissions.BRANCH_USER_CREATE,
];

export const USER_UPDATE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_USER_UPDATE,
  UserPermissions.BRANCH_USER_UPDATE,
];

export const USER_DELETE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_USER_DELETE,
  UserPermissions.BRANCH_USER_DELETE,
];

//----------------------
// Role Module Constants
//----------------------
export const ROLE_READ_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ROLE_READ,
  UserPermissions.BRANCH_ROLE_READ,
];

export const ROLE_CREATE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ROLE_CREATE,
  UserPermissions.BRANCH_ROLE_CREATE,
];

export const ROLE_UPDATE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ROLE_UPDATE,
  UserPermissions.BRANCH_ROLE_UPDATE,
];

export const ROLE_DELETE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_ROLE_DELETE,
  UserPermissions.BRANCH_ROLE_DELETE,
];

//----------------------
// Permission Module Constants
//----------------------
export const PERMISSION_READ_PERMISSIONS = [
  UserPermissions.ORGANIZATION_PERMISSION_READ,
  UserPermissions.BRANCH_PERMISSION_READ,
];

export const PERMISSION_MANAGE_PERMISSIONS = [
  UserPermissions.ORGANIZATION_PERMISSION_MANAGE,
  UserPermissions.BRANCH_PERMISSION_MANAGE,
];
