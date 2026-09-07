import { sql } from "drizzle-orm";
import { initDatabase } from "../../config/db";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";

function getScopeForKey(key: string): PermissionScope {
  if (key.startsWith("platform:")) {
    return PermissionScope.PLATFORM;
  }
  if (key.startsWith("organization:")) {
    return PermissionScope.ORGANIZATION;
  }
  if (key.startsWith("branch:")) {
    return PermissionScope.BRANCH;
  }
  if (key.startsWith("reseller:")) {
    return PermissionScope.RESELLER;
  }
  return PermissionScope.ORGANIZATION;
}

function formatDescription(key: string): string {
  return key
    .split(":")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const PRIVILEGED_KEYS = new Set<string>([
  UserPermissions.PLATFORM_ALL_READ,
  UserPermissions.PLATFORM_ALL_WRITE,
  UserPermissions.ORGANIZATION_ALL_READ,
  UserPermissions.ORGANIZATION_ALL_WRITE,
  UserPermissions.BRANCH_ALL_READ,
  UserPermissions.BRANCH_ALL_WRITE,
]);

export async function runSeedPermissions() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("🌱 Seeding all permissions from UserPermissions enum...");

  const allPermissionKeys = Object.values(UserPermissions);

  const permissionValues = allPermissionKeys.map((key) => ({
    key,
    description: formatDescription(key),
    scope: getScopeForKey(key),
    isPrivileged: PRIVILEGED_KEYS.has(key),
    isActive: true,
  }));

  console.log(`Found ${permissionValues.length} permissions to seed.`);

  for (const perm of permissionValues) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          scope: sql`EXCLUDED.scope`,
          description: sql`EXCLUDED.description`,
          isPrivileged: sql`EXCLUDED.is_privileged`,
          updatedAt: new Date(),
        },
      });
  }

  console.log("✅ Permissions seeded successfully!");
  await dbConfig.close();
}

runSeedPermissions()
  .catch((err) => {
    console.error("❌ Error seeding permissions:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
