import { initDatabase } from "../../config/db";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { permissionsMapper } from "../../modules/rbac/schemas/role-permission-mapper.schema";
import { roles } from "../../modules/rbac/schemas/role.schema";
import { userRolesMapper } from "../../modules/rbac/schemas/user-roles-mapper.schema";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";

export async function runRbacSeeds() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("Seeding RBAC...");

  // 1. Create ALL_WRITE permission
  const [platformWritePermission] = await db
    .insert(permissions)
    .values({
      key: UserPermissions.ALL_WRITE,
      // orgId and branchId are null by default because we made them nullable
    })
    .returning();

  console.log("Created permission: all:write");

  // 2. Create Platform Owner Role
  const [platformOwnerRole] = await db
    .insert(roles)
    .values({
      name: "Platform Owner",
      description: "Super admin role for platform owners",
      // orgId and branchId are null
    })
    .returning();

  console.log("Created role: Platform Owner");

  // 3. Map permission to Platform Owner role
  await db.insert(permissionsMapper).values({
    entityType: PermissionEntityType.ROLE,
    entityId: platformOwnerRole?.id!,
    permissionId: platformWritePermission?.id!,
  });

  console.log("Mapped all:write to Platform Owner role");

  // 4. Map a demo user ID (assuming standard uuid for demo)
  const demoUserId = "7d36cbd5-d5b0-4e15-89de-d911c7ab04fd"; // Hardcoded from your app.ts console.log token payload earlier, or arbitrary

  await db.insert(userRolesMapper).values({
    userId: demoUserId,
    roleId: platformOwnerRole?.id!,
  });

  console.log(`Assigned Platform Owner role to demo user: ${demoUserId}`);

  await dbConfig.close();
}

runRbacSeeds()
  .catch(console.error)
  .finally(() => process.exit(0));
