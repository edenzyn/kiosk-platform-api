export enum UserPermissions {
  // ======================================================
  // Global (Platform)
  // Used only by the platform roles.
  // ======================================================
  ALL_READ = "all:read",
  ALL_WRITE = "all:write",

  // ======================================================
  // Organization
  // ======================================================
  ORGANIZATION_ALL_READ = "organization:all:read",
  ORGANIZATION_ALL_WRITE = "organization:all:write",

  ORGANIZATION_READ = "organization:read",
  ORGANIZATION_UPDATE = "organization:update",

  ORGANIZATION_BRANCH_READ = "organization:branch:read",
  ORGANIZATION_BRANCH_WRITE = "organization:branch:write",

  ORGANIZATION_USER_READ = "organization:user:read",
  ORGANIZATION_USER_INVITE = "organization:user:invite",
  ORGANIZATION_USER_MANAGE = "organization:user:manage",

  ORGANIZATION_ROLE_READ = "organization:role:read",
  ORGANIZATION_ROLE_WRITE = "organization:role:write",

  ORGANIZATION_PERMISSION_READ = "organization:permission:read",
  ORGANIZATION_PERMISSION_MANAGE = "organization:permission:manage",

  // ======================================================
  // Branch
  // ======================================================
  BRANCH_ALL_READ = "branch:all:read",
  BRANCH_ALL_WRITE = "branch:all:write",

  BRANCH_READ = "branch:read",
  BRANCH_UPDATE = "branch:update",

  BRANCH_USER_READ = "branch:user:read",
  BRANCH_USER_INVITE = "branch:user:invite",
  BRANCH_USER_MANAGE = "branch:user:manage",

  BRANCH_ROLE_READ = "branch:role:read",
  BRANCH_ROLE_WRITE = "branch:role:write",

  BRANCH_PERMISSION_READ = "branch:permission:read",
  BRANCH_PERMISSION_MANAGE = "branch:permission:manage",
}
