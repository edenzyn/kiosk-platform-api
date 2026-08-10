import { UserPermissions } from "../enums/rbac/user-permission.enum";
import {
  BRANCH_PERMISSION_READ_MANAGE_PERMS,
  BRANCH_ROLE_READ_WRITE_PERMS,
  BRANCH_TOP_SCOPED_PERMISSIONS,
  BRANCH_USER_READ_MANAGE_PERMISSIONS,
  ORGANIZATION_PERMISSION_READ_MANAGE_PERMS,
  ORGANIZATION_ROLE_READ_WRITE_PERMS,
  ORGANIZATION_TOP_PERMISSIONS,
  ORGANIZATION_USER_READ_MANAGE_PERMS,
} from "./user-permission.constants";

export const DEFAULT_ORGANIZATION_ROLES = [
  {
    name: "Owner",
    permissions: ORGANIZATION_TOP_PERMISSIONS,
    isSystem: true,
    rank: 1,
  },
  {
    name: "Org Manager",
    permissions: [
      ...ORGANIZATION_ROLE_READ_WRITE_PERMS,
      ...ORGANIZATION_PERMISSION_READ_MANAGE_PERMS,
      ...ORGANIZATION_USER_READ_MANAGE_PERMS,
      UserPermissions.ORGANIZATION_BRANCH_WRITE,
      UserPermissions.ORGANIZATION_BRANCH_READ,
      UserPermissions.ORGANIZATION_READ,
      UserPermissions.ORGANIZATION_UPDATE,
      UserPermissions.ORGANIZATION_BASIC,
      UserPermissions.ORGANIZATION_USER_INVITE,
      UserPermissions.ORGANIZATION_DEVICE_WRITE,
      UserPermissions.ORGANIZATION_DEVICE_READ,
    ],
    rank: 2,
  },
];

export const DEFAULT_BRANCH_ROLES = [
  {
    name: "Manager",
    permissions: BRANCH_TOP_SCOPED_PERMISSIONS,
    isSystem: true,
    rank: 1,
  },
  {
    name: "Supervisor",
    permissions: [
      ...BRANCH_ROLE_READ_WRITE_PERMS,
      ...BRANCH_PERMISSION_READ_MANAGE_PERMS,
      ...BRANCH_USER_READ_MANAGE_PERMISSIONS,
      UserPermissions.BRANCH_UPDATE,
      UserPermissions.BRANCH_READ,
      UserPermissions.BRANCH_BASIC,
      UserPermissions.BRANCH_USER_INVITE,
      UserPermissions.BRANCH_DEVICE_WRITE,
      UserPermissions.BRANCH_DEVICE_READ,
    ],
    rank: 2,
  },
];
