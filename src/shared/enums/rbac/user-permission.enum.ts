export enum UserPermissions {
  // ======================================================
  // Platform Level
  // Grants unrestricted access across the entire platform.
  // Intended only for Platform/Super Administrators.
  // ======================================================
  ALL_READ = "all:read",
  ALL_WRITE = "all:write",

  // ======================================================
  // Organization Scope
  // Grants full access within the authenticated user's
  // organization. Does NOT allow creating or deleting
  // organizations.
  // ======================================================
  ORGANIZATION_ALL_READ = "organization:all-read",
  ORGANIZATION_ALL_WRITE = "organization:all-write",

  // ======================================================
  // Branch Administration
  // Organization-level permissions used to create or
  // delete branches within the current organization.
  // ======================================================
  BRANCH_CREATE = "branch:create",
  BRANCH_DELETE = "branch:delete",

  // ======================================================
  // Branch Scope
  // Grants full access within the authenticated user's
  // assigned branch. Does NOT allow creating or deleting
  // branches.
  // ======================================================
  BRANCH_ALL_READ = "branch:all-read",
  BRANCH_ALL_WRITE = "branch:all-write",

  // ======================================================
  // User Management
  // ======================================================
  USER_READ = "user:read",
  USER_CREATE = "user:create",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // ======================================================
  // Role Management
  // ======================================================
  ROLE_READ = "role:read",
  ROLE_CREATE = "role:create",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",

  // ======================================================
  // Permission Management
  // Read available permissions and assign/revoke them
  // from users or roles. Permission definitions themselves
  // are system-managed.
  // ======================================================
  PERMISSION_READ = "permission:read",
  PERMISSION_ASSIGN = "permission:assign",
}
