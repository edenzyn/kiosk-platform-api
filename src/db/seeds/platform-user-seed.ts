import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { initDatabase } from "../../config/db";
import { permissionMapper as permissionsMapper } from "../../modules/rbac/schemas/permission-mapper.schema";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { roles } from "../../modules/rbac/schemas/role.schema";
import { userRolesMapper } from "../../modules/rbac/schemas/user-roles-mapper.schema";
import { users } from "../../modules/user/schemas/user.schema";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { PermissionScope } from "../../shared/enums/rbac/permission-scope.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";

export async function runPlatformUserSeed() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("🌱 Seeding Platform User & Role...");

  // 1. Ensure PLATFORM_ALL_READ and PLATFORM_ALL_WRITE permissions exist
  const permKeys = [
    UserPermissions.PLATFORM_ALL_READ,
    UserPermissions.PLATFORM_ALL_WRITE,
  ];
  const seededPermissions = [];

  for (const key of permKeys) {
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, key))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      seededPermissions.push(existing[0]);
    } else {
      const [created] = await db
        .insert(permissions)
        .values({
          key,
          description:
            key === UserPermissions.PLATFORM_ALL_READ
              ? "Platform All Read (Global platform read access)"
              : "Platform All Write (Global platform write access)",
          scope: PermissionScope.PLATFORM,
          isPrivileged: true,
          isActive: true,
        })
        .returning();
      if (created) seededPermissions.push(created);
    }
  }

  console.log(
    `✅ Verified permissions: ${seededPermissions.map((p) => p.key).join(", ")}`,
  );

  // 2. Create or Find "Platform Owner" Role
  const existingRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "Platform Owner"))
    .limit(1);

  let platformRole = existingRoles[0];

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
    console.log(`✅ Created Role: ${platformRole.name} (${platformRole.id})`);
  } else {
    console.log(`ℹ️ Existing Role found: ${platformRole.name} (${platformRole.id})`);
  }

  // 3. Map permissions to Platform Owner role
  for (const perm of seededPermissions) {
    const existingMapping = await db
      .select()
      .from(permissionsMapper)
      .where(
        eq(permissionsMapper.entityId, platformRole.id),
      );

    const hasMapping = existingMapping.some(
      (m) => m.permissionId === perm.id && m.entityType === PermissionEntityType.ROLE,
    );

    if (!hasMapping) {
      await db.insert(permissionsMapper).values({
        entityType: PermissionEntityType.ROLE,
        entityId: platformRole.id,
        permissionId: perm.id,
        organizationId: null,
        branchId: null,
        isActive: true,
      });
      console.log(`✅ Mapped permission ${perm.key} to role ${platformRole.name}`);
    }
  }

  // 4. Create or Update Platform User (admin@platform.com / Pass@123)
  const passwordHash = await bcrypt.hash("Pass@123", 12);
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@platform.com"))
    .limit(1);

  let platformUser = existingUsers[0];

  if (!platformUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        name: "Platform Admin",
        email: "admin@platform.com",
        password: passwordHash,
        userType: UserTypeEnums.PLATFORM,
        organizationId: null,
        branchId: null,
        isActive: true,
      })
      .returning();
    if (!newUser) throw new Error("Failed to create platform user");
    platformUser = newUser;
    console.log(`✅ Created Platform User: ${platformUser.email} (${platformUser.id})`);
  } else {
    const [updated] = await db
      .update(users)
      .set({
        password: passwordHash,
        userType: UserTypeEnums.PLATFORM,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, platformUser.id))
      .returning();
    if (updated) platformUser = updated;
    console.log(`✅ Updated existing Platform User: ${platformUser.email} (${platformUser.id})`);
  }

  // 5. Map Platform Owner Role to User
  const existingUserRole = await db
    .select()
    .from(userRolesMapper)
    .where(eq(userRolesMapper.userId, platformUser.id));

  const hasRole = existingUserRole.some((ur) => ur.roleId === platformRole.id);

  if (!hasRole) {
    await db.insert(userRolesMapper).values({
      userId: platformUser.id,
      roleId: platformRole.id,
    });
    console.log(`✅ Mapped Role ${platformRole.name} to User ${platformUser.email}`);
  } else {
    console.log(`ℹ️ Role ${platformRole.name} is already mapped to User ${platformUser.email}`);
  }

  console.log("\n🎉 Platform User seeding completed successfully!");
  console.log("-----------------------------------------");
  console.log("Email:    admin@platform.com");
  console.log("Password: Pass@123");
  console.log("Role:     Platform Owner (rank: 1)");
  console.log("Perms:    platform:all:read, platform:all:write");
  console.log("-----------------------------------------");

  await dbConfig.close();
}

runPlatformUserSeed()
  .catch((err) => {
    console.error("❌ Error seeding platform user:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
