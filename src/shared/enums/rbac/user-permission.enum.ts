export enum UserPermissions {
  // ======================================================
  // Platform
  // ======================================================
  PLATFORM_ALL_READ = "platform:all:read",
  PLATFORM_ALL_WRITE = "platform:all:write",
  PLATFORM_BASIC = "platform:basic",

  PLATFORM_ORGANIZATION_READ = "platform:organization:read",
  PLATFORM_ORGANIZATION_WRITE = "platform:organization:write",

  PLATFORM_RESELLER_READ = "platform:reseller:read",
  PLATFORM_RESELLER_WRITE = "platform:reseller:write",

  PLATFORM_DEVICE_READ = "platform:device:read",
  PLATFORM_DEVICE_WRITE = "platform:device:write",

  PLATFORM_LICENSE_READ = "platform:license:read",
  PLATFORM_LICENSE_WRITE = "platform:license:write",

  PLATFORM_ROLE_READ = "platform:role:read",
  PLATFORM_ROLE_WRITE = "platform:role:write",

  PLATFORM_AUDIT_READ = "platform:audit:read",

  PLATFORM_SETTING_READ = "platform:setting:read",
  PLATFORM_SETTING_WRITE = "platform:setting:write",

  // ======================================================
  // Organization
  // ======================================================
  ORGANIZATION_ALL_READ = "organization:all:read",
  ORGANIZATION_ALL_WRITE = "organization:all:write",

  ORGANIZATION_READ = "organization:read",
  ORGANIZATION_UPDATE = "organization:update",
  ORGANIZATION_BASIC = "organization:basic",

  ORGANIZATION_BRANCH_READ = "organization:branch:read",
  ORGANIZATION_BRANCH_WRITE = "organization:branch:write",

  ORGANIZATION_USER_READ = "organization:user:read",
  ORGANIZATION_USER_INVITE = "organization:user:invite",
  ORGANIZATION_USER_MANAGE = "organization:user:manage",

  ORGANIZATION_ROLE_READ = "organization:role:read",
  ORGANIZATION_ROLE_WRITE = "organization:role:write",

  ORGANIZATION_LICENSE_READ = "organization:license:read",
  ORGANIZATION_LICENSE_WRITE = "organization:license:write",

  ORGANIZATION_PERMISSION_READ = "organization:permission:read",
  ORGANIZATION_PERMISSION_MANAGE = "organization:permission:manage",

  ORGANIZATION_DEVICE_READ = "organization:device:read",
  ORGANIZATION_DEVICE_WRITE = "organization:device:write",

  // ======================================================
  // Branch
  // ======================================================
  BRANCH_ALL_READ = "branch:all:read",
  BRANCH_ALL_WRITE = "branch:all:write",

  BRANCH_READ = "branch:read",
  BRANCH_UPDATE = "branch:update",
  BRANCH_BASIC = "branch:basic",

  BRANCH_USER_READ = "branch:user:read",
  BRANCH_USER_INVITE = "branch:user:invite",
  BRANCH_USER_MANAGE = "branch:user:manage",

  BRANCH_ROLE_READ = "branch:role:read",
  BRANCH_ROLE_WRITE = "branch:role:write",

  BRANCH_LICENSE_READ = "branch:license:read",
  BRANCH_LICENSE_WRITE = "branch:license:write",

  BRANCH_PERMISSION_READ = "branch:permission:read",
  BRANCH_PERMISSION_MANAGE = "branch:permission:manage",

  BRANCH_DEVICE_READ = "branch:device:read",
  BRANCH_DEVICE_WRITE = "branch:device:write",

  // ======================================================
  // Reseller
  // ======================================================
  RESELLER_BASIC = "reseller:basic",
}
