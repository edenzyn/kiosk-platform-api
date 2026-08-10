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
export const ORGANIZATION_USER_READ_MANAGE_PERMS = [
  UserPermissions.ORGANIZATION_USER_READ,
  UserPermissions.ORGANIZATION_USER_MANAGE,
];

export const BRANCH_USER_READ_MANAGE_PERMISSIONS = [
  UserPermissions.BRANCH_USER_READ,
  UserPermissions.BRANCH_USER_MANAGE,
];

//----------------------
// Role Module Constants
//----------------------
export const ORGANIZATION_ROLE_READ_WRITE_PERMS = [
  UserPermissions.ORGANIZATION_ROLE_READ,
  UserPermissions.ORGANIZATION_ROLE_WRITE,
];

export const BRANCH_ROLE_READ_WRITE_PERMS = [
  UserPermissions.BRANCH_ROLE_READ,
  UserPermissions.BRANCH_ROLE_WRITE,
];

//----------------------
// Permission Module Constants
//----------------------
export const ORGANIZATION_PERMISSION_READ_MANAGE_PERMS = [
  UserPermissions.ORGANIZATION_PERMISSION_READ,
  UserPermissions.ORGANIZATION_PERMISSION_MANAGE,
];

export const BRANCH_PERMISSION_READ_MANAGE_PERMS = [
  UserPermissions.BRANCH_PERMISSION_READ,
  UserPermissions.BRANCH_PERMISSION_MANAGE,
];

//----------------------
// Device Module Constants
//----------------------
export const ORGANIZATION_DEVICE_READ_WRITE_PERMS = [
  UserPermissions.ORGANIZATION_DEVICE_READ,
  UserPermissions.ORGANIZATION_DEVICE_WRITE,
];

export const BRANCH_DEVICE_READ_WRITE_PERMS = [
  UserPermissions.BRANCH_DEVICE_READ,
  UserPermissions.BRANCH_DEVICE_WRITE,
];
