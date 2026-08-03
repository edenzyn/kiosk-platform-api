import { and, eq } from "drizzle-orm";
import { initDatabase } from "../../config/db";
import { permissions } from "../../modules/rbac/schemas/permission.schema";
import { roles } from "../../modules/rbac/schemas/role.schema";
import { permissionMapper } from "../../modules/rbac/schemas/permission-mapper.schema";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";

export async function runMapRolePermissions() {
  const dbConfig = initDatabase();
  const db = dbConfig.client;

  console.log("Mapping permissions to role...");

  const targetRoleId = "35dace8b-6d43-45b8-8687-c72bfc0be59a";
  const [targetRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, targetRoleId));

  if (!targetRole) {
    console.warn(`Target role with ID ${targetRoleId} not found in the database.`);
  } else {
    console.log(`Found target role: ${targetRole.name} (Org ID: ${targetRole.organizationId})`);

    const [readPerm] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, UserPermissions.ORGANIZATION_ALL_READ));

    const [writePerm] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, UserPermissions.ORGANIZATION_ALL_WRITE));

    if (!readPerm || !writePerm) {
      throw new Error("Could not find organization:all-read or organization:all-write permissions in db");
    }

    // Map organization:all-read
    const [existingReadMap] = await db
      .select()
      .from(permissionMapper)
      .where(
        and(
          eq(permissionMapper.entityType, PermissionEntityType.ROLE),
          eq(permissionMapper.entityId, targetRole.id),
          eq(permissionMapper.permissionId, readPerm.id)
        )
      );

    if (!existingReadMap) {
      await db.insert(permissionMapper).values({
        entityType: PermissionEntityType.ROLE,
        entityId: targetRole.id,
        permissionId: readPerm.id,
        organizationId: targetRole.organizationId,
        branchId: targetRole.branchId,
      });
      console.log(`Mapped organization:all-read to role: ${targetRole.name}`);
    } else {
      console.log(`Permission organization:all-read is already mapped to role: ${targetRole.name}`);
    }

    // Map organization:all-write
    const [existingWriteMap] = await db
      .select()
      .from(permissionMapper)
      .where(
        and(
          eq(permissionMapper.entityType, PermissionEntityType.ROLE),
          eq(permissionMapper.entityId, targetRole.id),
          eq(permissionMapper.permissionId, writePerm.id)
        )
      );

    if (!existingWriteMap) {
      await db.insert(permissionMapper).values({
        entityType: PermissionEntityType.ROLE,
        entityId: targetRole.id,
        permissionId: writePerm.id,
        organizationId: targetRole.organizationId,
        branchId: targetRole.branchId,
      });
      console.log(`Mapped organization:all-write to role: ${targetRole.name}`);
    } else {
      console.log(`Permission organization:all-write is already mapped to role: ${targetRole.name}`);
    }
  }

  console.log("Role mapping completed successfully!");
  await dbConfig.close();
}

runMapRolePermissions()
  .catch((err) => {
    console.error("Error mapping role permissions:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
