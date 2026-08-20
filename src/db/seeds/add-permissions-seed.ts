import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
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

  console.log("Ensuring permissions table schema has is_privileged column...");
  await db.execute(
    sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_privileged boolean DEFAULT false NOT NULL;`,
  );

  console.log(
    "Updating SQL function fn_get_permissions_by_scope_and_tenant...",
  );
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_permissions_by_scope_and_tenant(UUID, SMALLINT, UUID, UUID, SMALLINT);`,
  );
  const sqlFilePath = path.join(
    __dirname,
    "../sql/functions/fn_get_permissions_by_scope_and_tenant.sql",
  );
  const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
  await db.execute(sql.raw(sqlContent));

  console.log("Updating SQL function fn_get_user_permission_keys_by_tenant...");
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_user_permission_keys_by_tenant(UUID, UUID, UUID);`,
  );
  const userPermsSqlPath = path.join(
    __dirname,
    "../sql/functions/fn_get_user_permission_keys_by_tenant.sql",
  );
  const userPermsSql = fs.readFileSync(userPermsSqlPath, "utf-8");
  await db.execute(sql.raw(userPermsSql));

  console.log("Updating SQL function fn_get_roles_by_tenant_and_scope...");
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_roles_by_tenant(TEXT, UUID, UUID);`,
  );
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_roles_by_tenant_and_scope(TEXT, UUID, UUID);`,
  );
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_roles_by_tenant_and_scope(TEXT, UUID, UUID, BOOLEAN);`,
  );
  const rolesSqlPath = path.join(
    __dirname,
    "../sql/functions/fn_get_roles_by_tenant_and_scope.sql",
  );
  const rolesSql = fs.readFileSync(rolesSqlPath, "utf-8");
  await db.execute(sql.raw(rolesSql));

  console.log("Updating SQL function fn_get_license_history_by_user_type...");
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_license_history(UUID, SMALLINT[], INTEGER);`,
  );
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_license_history_by_user_type(UUID, SMALLINT[], INTEGER);`,
  );
  const licenseHistorySqlPath = path.join(
    __dirname,
    "../sql/functions/fn_get_license_history_by_user_type.sql",
  );
  const licenseHistorySql = fs.readFileSync(licenseHistorySqlPath, "utf-8");
  await db.execute(sql.raw(licenseHistorySql));

  console.log("Updating SQL function fn_get_license_details_by_user_type...");
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_license_details_by_user_type(UUID, INTEGER);`,
  );
  const licenseDetailsSqlPath = path.join(
    __dirname,
    "../sql/functions/fn_get_license_details_by_user_type.sql",
  );
  const licenseDetailsSql = fs.readFileSync(licenseDetailsSqlPath, "utf-8");
  await db.execute(sql.raw(licenseDetailsSql));

  console.log(
    "Updating SQL function fn_get_license_transactions_by_user_type...",
  );
  await db.execute(
    sql`DROP FUNCTION IF EXISTS fn_get_license_transactions_by_user_type(UUID, INTEGER);`,
  );
  const licenseTransactionsSqlPath = path.join(
    __dirname,
    "../sql/functions/fn_get_license_transactions_by_user_type.sql",
  );
  const licenseTransactionsSql = fs.readFileSync(
    licenseTransactionsSqlPath,
    "utf-8",
  );
  await db.execute(sql.raw(licenseTransactionsSql));

  console.log("Seeding all permissions from UserPermissions enum...");

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

  console.log("Permissions seeded successfully!");
  await dbConfig.close();
}

runSeedPermissions()
  .catch((err) => {
    console.error("Error seeding permissions:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
