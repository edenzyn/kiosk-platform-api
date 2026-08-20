import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { initDatabase } from "../../config/db";
import { organizations } from "../../modules/organization/organization.schema";
import { permissionMapper as permissionsMapper } from "../../modules/rbac/schemas/permission-mapper.schema";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { roles } from "../../modules/rbac/schemas/role.schema";
import { userRolesMapper } from "../../modules/rbac/schemas/user-roles-mapper.schema";
import { users } from "../../modules/user/schemas/user.schema";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";

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

export async function runBasicDataSeed() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("==================================================");
  console.log("🌱 Starting Basic Data Seed");
  console.log("==================================================");

  // ====================================================================
  // 1. Ensure Table Schema & Update SQL Helper Functions
  // ====================================================================
  console.log("\n📦 Step 1: Checking schema and updating SQL helper functions...");

  await db.execute(
    sql`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_privileged boolean DEFAULT false NOT NULL;`,
  );

  const functionsDir = path.join(__dirname, "../sql/functions");

  const sqlFiles = [
    {
      drop: "DROP FUNCTION IF EXISTS fn_get_permissions_by_scope_and_tenant(UUID, SMALLINT, UUID, UUID, SMALLINT);",
      file: "fn_get_permissions_by_scope_and_tenant.sql",
    },
    {
      drop: "DROP FUNCTION IF EXISTS fn_get_user_permission_keys_by_tenant(UUID, UUID, UUID);",
      file: "fn_get_user_permission_keys_by_tenant.sql",
    },
    {
      drop: `
        DROP FUNCTION IF EXISTS fn_get_roles_by_tenant(TEXT, UUID, UUID);
        DROP FUNCTION IF EXISTS fn_get_roles_by_tenant_and_scope(TEXT, UUID, UUID);
        DROP FUNCTION IF EXISTS fn_get_roles_by_tenant_and_scope(TEXT, UUID, UUID, BOOLEAN);
      `,
      file: "fn_get_roles_by_tenant_and_scope.sql",
    },
    {
      drop: "DROP FUNCTION IF EXISTS fn_get_license_history(UUID, SMALLINT[], INTEGER);\nDROP FUNCTION IF EXISTS fn_get_license_history_by_user_type(UUID, SMALLINT[], INTEGER);",
      file: "fn_get_license_history_by_user_type.sql",
    },
    {
      drop: "DROP FUNCTION IF EXISTS fn_get_license_details_by_user_type(UUID, INTEGER);",
      file: "fn_get_license_details_by_user_type.sql",
    },
    {
      drop: "DROP FUNCTION IF EXISTS fn_get_license_transactions_by_user_type(UUID, INTEGER);",
      file: "fn_get_license_transactions_by_user_type.sql",
    },
  ];

  for (const { drop, file } of sqlFiles) {
    const filePath = path.join(functionsDir, file);
    if (fs.existsSync(filePath)) {
      await db.execute(sql.raw(drop));
      const content = fs.readFileSync(filePath, "utf-8");
      await db.execute(sql.raw(content));
      console.log(`  ✓ Updated SQL function: ${file}`);
    }
  }

  // ====================================================================
  // 2. Seed All Enum Permissions into DB
  // ====================================================================
  console.log("\n🔑 Step 2: Injecting all permissions from UserPermissions enum...");

  const allPermissionKeys = Object.values(UserPermissions);
  const permissionValues = allPermissionKeys.map((key) => ({
    key,
    description: formatDescription(key),
    scope: getScopeForKey(key),
    isPrivileged: PRIVILEGED_KEYS.has(key),
    isActive: true,
  }));

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

  console.log(`  ✓ Injected ${permissionValues.length} permissions into database.`);

  // Cache all seeded permissions for quick lookup
  const allDbPermissions = await db.select().from(permissions);
  const permissionMap = new Map<string, (typeof allDbPermissions)[0]>();
  for (const p of allDbPermissions) {
    permissionMap.set(p.key, p);
  }

  // ====================================================================
  // 3. Platform Super-Admin Setup (admin@plat.com / Pass@123)
  // ====================================================================
  console.log("\n👑 Step 3: Setting up Platform Super-Admin & Role...");

  // 3a. Find or create Platform Owner Role
  const existingPlatformRoles = await db
    .select()
    .from(roles)
    .where(and(eq(roles.name, "Platform Owner"), eq(roles.rank, 1)))
    .limit(1);

  let platformRole = existingPlatformRoles[0];
  if (!platformRole) {
    const [newRole] = await db
      .insert(roles)
      .values({
        name: "Platform Owner",
        description: "Super-admin role with full platform access",
        rank: 1,
        isSystem: true,
        isActive: true,
        organizationId: null,
        branchId: null,
      })
      .returning();
    if (!newRole) throw new Error("Failed to create Platform Owner role");
    platformRole = newRole;
    console.log(`  ✓ Created Platform Role: ${platformRole.name}`);
  } else {
    console.log(`  ℹ Found existing Platform Role: ${platformRole.name}`);
  }

  // 3b. Map platform permissions (platform:all:read, platform:all:write) to Platform Owner role
  const platformPermKeys = [
    UserPermissions.PLATFORM_ALL_READ,
    UserPermissions.PLATFORM_ALL_WRITE,
  ];

  for (const key of platformPermKeys) {
    const permEntity = permissionMap.get(key);
    if (!permEntity) continue;

    const existingMapping = await db
      .select()
      .from(permissionsMapper)
      .where(
        and(
          eq(permissionsMapper.entityType, PermissionEntityType.ROLE),
          eq(permissionsMapper.entityId, platformRole.id),
          eq(permissionsMapper.permissionId, permEntity.id),
        ),
      )
      .limit(1);

    if (existingMapping.length === 0) {
      await db.insert(permissionsMapper).values({
        entityType: PermissionEntityType.ROLE,
        entityId: platformRole.id,
        permissionId: permEntity.id,
        organizationId: null,
        branchId: null,
        isActive: true,
      });
      console.log(`  ✓ Mapped ${key} to Platform Role`);
    }
  }

  // 3c. Create or update Platform User (admin@plat.com / Pass@123)
  const passwordHash = await bcrypt.hash("Pass@123", 12);
  const platformEmail = "admin@plat.com";

  const existingPlatformUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, platformEmail))
    .limit(1);

  let platformUser = existingPlatformUsers[0];
  if (!platformUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        name: "Platform Admin",
        email: platformEmail,
        password: passwordHash,
        userType: UserTypeEnums.PLATFORM,
        organizationId: null,
        branchId: null,
        isActive: true,
      })
      .returning();
    if (!newUser) throw new Error("Failed to create platform user");
    platformUser = newUser;
    console.log(`  ✓ Created Platform User: ${platformUser.email}`);
  } else {
    const [updated] = await db
      .update(users)
      .set({
        name: "Platform Admin",
        password: passwordHash,
        userType: UserTypeEnums.PLATFORM,
        organizationId: null,
        branchId: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, platformUser.id))
      .returning();
    if (updated) platformUser = updated;
    console.log(`  ✓ Updated Platform User: ${platformUser.email}`);
  }

  // 3d. Link Platform Role to Platform User
  const existingPlatformUserRole = await db
    .select()
    .from(userRolesMapper)
    .where(
      and(
        eq(userRolesMapper.userId, platformUser.id),
        eq(userRolesMapper.roleId, platformRole.id),
      ),
    )
    .limit(1);

  if (existingPlatformUserRole.length === 0) {
    await db.insert(userRolesMapper).values({
      userId: platformUser.id,
      roleId: platformRole.id,
    });
    console.log(`  ✓ Linked Platform Role to ${platformUser.email}`);
  }

  // ====================================================================
  // 4. Organization Setup with Top Role & User (admin@org.com / Pass@123)
  // ====================================================================
  console.log("\n🏢 Step 4: Setting up Organization, Top Role & Org User...");

  // 4a. Create or find Organization
  const orgName = "Demo Organization";
  const existingOrgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, orgName))
    .limit(1);

  let demoOrg = existingOrgs[0];
  if (!demoOrg) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        isActive: true,
      })
      .returning();
    if (!newOrg) throw new Error("Failed to create Organization");
    demoOrg = newOrg;
    console.log(`  ✓ Created Organization: ${demoOrg.name} (${demoOrg.id})`);
  } else {
    console.log(`  ℹ Found existing Organization: ${demoOrg.name} (${demoOrg.id})`);
  }

  // 4b. Create or find Top Role for the Organization
  const existingOrgRoles = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, demoOrg.id),
        eq(roles.name, "Organization Owner"),
        eq(roles.rank, 1),
      ),
    )
    .limit(1);

  let orgTopRole = existingOrgRoles[0];
  if (!orgTopRole) {
    const [newRole] = await db
      .insert(roles)
      .values({
        name: "Organization Owner",
        description: "Top-level administrator role with full organization access",
        rank: 1,
        isSystem: true,
        isActive: true,
        organizationId: demoOrg.id,
        branchId: null,
      })
      .returning();
    if (!newRole) throw new Error("Failed to create Organization Owner role");
    orgTopRole = newRole;
    console.log(`  ✓ Created Org Top Role: ${orgTopRole.name}`);
  } else {
    console.log(`  ℹ Found existing Org Top Role: ${orgTopRole.name}`);
  }

  // 4c. Map Organization permissions (organization:all:read, organization:all:write) to this Role
  const orgPermKeys = [
    UserPermissions.ORGANIZATION_ALL_READ,
    UserPermissions.ORGANIZATION_ALL_WRITE,
  ];

  for (const key of orgPermKeys) {
    const permEntity = permissionMap.get(key);
    if (!permEntity) continue;

    const existingMapping = await db
      .select()
      .from(permissionsMapper)
      .where(
        and(
          eq(permissionsMapper.entityType, PermissionEntityType.ROLE),
          eq(permissionsMapper.entityId, orgTopRole.id),
          eq(permissionsMapper.permissionId, permEntity.id),
          eq(permissionsMapper.organizationId, demoOrg.id),
        ),
      )
      .limit(1);

    if (existingMapping.length === 0) {
      await db.insert(permissionsMapper).values({
        entityType: PermissionEntityType.ROLE,
        entityId: orgTopRole.id,
        permissionId: permEntity.id,
        organizationId: demoOrg.id,
        branchId: null,
        isActive: true,
      });
      console.log(`  ✓ Mapped ${key} to ${orgTopRole.name}`);
    }
  }

  // 4d. Create or update Org User (admin@org.com / Pass@123)
  const orgEmail = "admin@org.com";
  const existingOrgUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, orgEmail))
    .limit(1);

  let orgUser = existingOrgUsers[0];
  if (!orgUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        name: "Organization Admin",
        email: orgEmail,
        password: passwordHash,
        userType: UserTypeEnums.NORMAL,
        organizationId: demoOrg.id,
        branchId: null,
        isActive: true,
      })
      .returning();
    if (!newUser) throw new Error("Failed to create organization user");
    orgUser = newUser;
    console.log(`  ✓ Created Organization User: ${orgUser.email}`);
  } else {
    const [updated] = await db
      .update(users)
      .set({
        name: "Organization Admin",
        password: passwordHash,
        userType: UserTypeEnums.NORMAL,
        organizationId: demoOrg.id,
        branchId: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, orgUser.id))
      .returning();
    if (updated) orgUser = updated;
    console.log(`  ✓ Updated Organization User: ${orgUser.email}`);
  }

  // 4e. Link Org Top Role to Org User
  const existingOrgUserRole = await db
    .select()
    .from(userRolesMapper)
    .where(
      and(
        eq(userRolesMapper.userId, orgUser.id),
        eq(userRolesMapper.roleId, orgTopRole.id),
      ),
    )
    .limit(1);

  if (existingOrgUserRole.length === 0) {
    await db.insert(userRolesMapper).values({
      userId: orgUser.id,
      roleId: orgTopRole.id,
    });
    console.log(`  ✓ Linked Org Top Role to ${orgUser.email}`);
  }

  // ====================================================================
  // Summary Log
  // ====================================================================
  console.log("\n==================================================");
  console.log("🎉 Basic Data Seed Completed Successfully!");
  console.log("==================================================");
  console.log("\n📌 [Platform Super-Admin Account]");
  console.log(`   Email:        admin@plat.com`);
  console.log(`   Password:     Pass@123`);
  console.log(`   User Type:    PLATFORM (3)`);
  console.log(`   Role:         Platform Owner (rank: 1)`);
  console.log(`   Permissions:  platform:all:read, platform:all:write`);

  console.log("\n📌 [Organization Admin Account]");
  console.log(`   Email:        admin@org.com`);
  console.log(`   Password:     Pass@123`);
  console.log(`   User Type:    NORMAL (1)`);
  console.log(`   Organization: ${demoOrg.name} (${demoOrg.id})`);
  console.log(`   Role:         Organization Owner (rank: 1)`);
  console.log(`   Permissions:  organization:all:read, organization:all:write`);
  console.log("==================================================\n");

  await dbConfig.close();
}

runBasicDataSeed()
  .catch((err) => {
    console.error("❌ Error running basic data seed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
