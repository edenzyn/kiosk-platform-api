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
  ORGANIZATION_BRANCH_CREATE = "organization:branch:create",
  ORGANIZATION_BRANCH_UPDATE = "organization:branch:update",
  ORGANIZATION_BRANCH_DELETE = "organization:branch:delete",

  ORGANIZATION_USER_READ = "organization:user:read",
  ORGANIZATION_USER_CREATE = "organization:user:create",
  ORGANIZATION_USER_UPDATE = "organization:user:update",
  ORGANIZATION_USER_DELETE = "organization:user:delete",

  ORGANIZATION_ROLE_READ = "organization:role:read",
  ORGANIZATION_ROLE_CREATE = "organization:role:create",
  ORGANIZATION_ROLE_UPDATE = "organization:role:update",
  ORGANIZATION_ROLE_DELETE = "organization:role:delete",

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
  BRANCH_USER_CREATE = "branch:user:create",
  BRANCH_USER_UPDATE = "branch:user:update",
  BRANCH_USER_DELETE = "branch:user:delete",

  BRANCH_ROLE_READ = "branch:role:read",
  BRANCH_ROLE_CREATE = "branch:role:create",
  BRANCH_ROLE_UPDATE = "branch:role:update",
  BRANCH_ROLE_DELETE = "branch:role:delete",

  BRANCH_PERMISSION_READ = "branch:permission:read",
  BRANCH_PERMISSION_MANAGE = "branch:permission:manage",
}
