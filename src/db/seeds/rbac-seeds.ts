import { initDatabase } from "../../config/db";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { permissionMapper as permissionsMapper } from "../../modules/rbac/schemas/permission-mapper.schema";
import { roles } from "../../modules/rbac/schemas/role.schema";
import { userRolesMapper } from "../../modules/rbac/schemas/user-roles-mapper.schema";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { organizations } from "../../modules/organization/organization.schema";
import { users } from "../../modules/user/user.schema";
import { UserTypeEnums } from "../../shared/enums/user-type.enum";
import bcrypt from "bcrypt";

export async function runRbacSeeds() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("Seeding RBAC...");

  // 1. Create Organization
  const [demoOrg] = await db
    .insert(organizations)
    .values({
      name: "Demo Organization",
    })
    .returning();
  if (!demoOrg) throw new Error("Failed to create demoOrg");

  console.log(`Created Organization: ${demoOrg.id}`);

  // 2. Create User
  const passwordHash = await bcrypt.hash("Pass@123", 12);
  const [demoUser] = await db
    .insert(users)
    .values({
      name: "Org Admin User",
      email: "admin@org.com",
      password: passwordHash,
      userType: UserTypeEnums.NORMAL, // Using the normal user type, RBAC handles permissions
      organizationId: demoOrg.id,
    })
    .returning();
  if (!demoUser) throw new Error("Failed to create demoUser");

  console.log(`Created User: ${demoUser.id}`);

  // 3. Create Permissions
  const [readPerm, writePerm] = await db
    .insert(permissions)
    .values([
      {
        key: UserPermissions.ORGANIZATION_READ,
        description: "Read organization details",
      },
      {
        key: UserPermissions.ORGANIZATION_WRITE,
        description: "Write organization details",
      },
    ])
    .returning();
  if (!readPerm || !writePerm) throw new Error("Failed to create permissions");

  console.log("Created permissions: organization:read, organization:write");

  // 4. Create Role and link to Organization
  const [orgAdminRole] = await db
    .insert(roles)
    .values({
      name: "Organization Admin",
      description: "Admin role for the organization",
      organizationId: demoOrg.id,
    })
    .returning();
  if (!orgAdminRole) throw new Error("Failed to create orgAdminRole");

  console.log(`Created Role: ${orgAdminRole.id} for Organization`);

  // 5. Map permissions to Role
  await db.insert(permissionsMapper).values([
    {
      entityType: PermissionEntityType.ROLE,
      entityId: orgAdminRole.id,
      permissionId: readPerm.id,
      organizationId: demoOrg.id,
    },
    {
      entityType: PermissionEntityType.ROLE,
      entityId: orgAdminRole.id,
      permissionId: writePerm.id,
      organizationId: demoOrg.id,
    },
  ]);

  console.log("Mapped permissions to Role");

  // 6. Map Role to User
  await db.insert(userRolesMapper).values({
    userId: demoUser.id,
    roleId: orgAdminRole.id,
  });

  console.log("Mapped Role to User");

  await dbConfig.close();
}

runRbacSeeds()
  .catch(console.error)
  .finally(() => process.exit(0));
