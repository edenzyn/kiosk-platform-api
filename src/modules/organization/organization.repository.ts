import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { permissionMapper } from "../rbac/schemas/permission-mapper.schema";
import { roles } from "../rbac/schemas/role.schema";
import { userRolesMapper } from "../rbac/schemas/user-roles-mapper.schema";
import { userInvitations } from "../user/schemas/user-invitations.schema";
import { users } from "../user/schemas/user.schema";
import { organizations } from "./schemas/organization.schema";
import {
  organizationSettings,
  type OrganizationSettingsEntity,
} from "./schemas/organization-settings.schema";
import type {
  CreateOrganizationWithOwnerRepoInput,
  CreateOrganizationWithOwnerRepoResult,
  FindOneOrganizationRepoInput,
  FindOneOrganizationRepoResult,
  FindPaginatedOrganizationsRepoInput,
  FindPaginatedOrganizationsRepoResult,
  UpdateOrganizationRepoInput,
  UpdateOrganizationRepoResult,
  UpdateOrganizationSettingsRepoInput,
} from "./organization.types";

export class OrganizationRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? ORGANIZATION SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneOrganizationRepoInput,
  ): Promise<FindOneOrganizationRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) {
      conditions.push(eq(organizations.id, input.id));
    }
    if (input.name !== undefined) {
      conditions.push(eq(organizations.name, input.name));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    const [organization] = await this.database.client
      .select()
      .from(organizations)
      .where(and(...conditions))
      .limit(1);

    return organization;
  }

  async update(
    input: UpdateOrganizationRepoInput,
  ): Promise<UpdateOrganizationRepoResult> {
    const [updated] = await this.database.client
      .update(organizations)
      .set({
        ...input.data,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, input.id))
      .returning();

    if (!updated) {
      throw new Error("Organization not found");
    }
    return updated;
  }

  async findPaginated(
    input: FindPaginatedOrganizationsRepoInput,
  ): Promise<FindPaginatedOrganizationsRepoResult> {
    const { search, isActive, page, limit, sortBy, sortOrder } = input;

    const conditions: (SQL | undefined)[] = [];

    if (isActive !== undefined) {
      conditions.push(eq(organizations.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(organizations.name, `%${search}%`));
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(organizations)
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select()
      .from(organizations)
      .where(condition)
      .$dynamic();

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === SortingOrderEnum.ASC ? asc : desc;
      if (sortBy === "name") {
        query = query.orderBy(orderFn(organizations.name));
      } else if (sortBy === "isActive") {
        query = query.orderBy(orderFn(organizations.isActive));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(organizations.createdAt));
      }
    } else {
      query = query.orderBy(desc(organizations.createdAt));
    }

    query = query.limit(limit).offset((page - 1) * limit);

    const organizationsResult = await query;
    return { organizations: organizationsResult, total };
  }

  // ========================================
  // ? ORGANIZATION INVITE ACCEPT (multi-table transaction)
  // ========================================
  async createOrganizationWithOwner(
    input: CreateOrganizationWithOwnerRepoInput,
  ): Promise<CreateOrganizationWithOwnerRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: input.organizationName,
          registeredName: input.registeredName,
          registrationNumber: input.registrationNumber,
        })
        .returning();
      if (!organization) throw new Error("Failed to create organization");

      const [user] = await tx
        .insert(users)
        .values({
          organizationId: organization.id,
          branchId: null,
          name: input.owner.name,
          email: input.owner.email,
          password: input.owner.hashedPassword,
          userType: UserTypeEnums.NORMAL,
        })
        .returning();
      if (!user) throw new Error("Failed to create owner user");

      const [updatedOrganization] = await tx
        .update(organizations)
        .set({ createdBy: user.id, updatedBy: user.id })
        .where(eq(organizations.id, organization.id))
        .returning();

      await tx.insert(organizationSettings).values({
        organizationId: organization.id,
      });

      let ownerRoleId: string | undefined;

      for (const defaultRole of input.defaultRoles) {
        const [role] = await tx
          .insert(roles)
          .values({
            organizationId: organization.id,
            branchId: null,
            name: defaultRole.name,
            description: `Default organization ${defaultRole.name.toLowerCase()} role`,
            rank: defaultRole.rank,
            isSystem: defaultRole.isSystem ?? false,
            createdBy: user.id,
          })
          .returning();
        if (!role) throw new Error(`Failed to create ${defaultRole.name} role`);

        if (defaultRole.isSystem) {
          ownerRoleId = role.id;
        }

        const permissionMappers = defaultRole.permissions
          .map((pKey) => {
            const permissionId = input.keyToIdMap.get(pKey);
            if (!permissionId) return null;
            return {
              entityType: PermissionEntityType.ROLE,
              entityId: role.id,
              permissionId,
              organizationId: organization.id,
              branchId: null,
              isActive: true,
              createdBy: user.id,
            };
          })
          .filter((pm): pm is NonNullable<typeof pm> => pm !== null);

        if (permissionMappers.length > 0) {
          await tx.insert(permissionMapper).values(permissionMappers);
        }
      }

      if (!ownerRoleId) {
        throw new Error("Owner role was not created");
      }

      await tx.insert(userRolesMapper).values({
        userId: user.id,
        roleId: ownerRoleId,
        createdBy: user.id,
      });

      await tx
        .update(userInvitations)
        .set({
          status: UserInvitationStatusEnum.ACCEPTED,
          updatedBy: user.id,
        })
        .where(eq(userInvitations.id, input.invitationId));

      return {
        organization: updatedOrganization ?? organization,
        user,
        ownerRoleId,
      };
    });
  }

  // ========================================
  // ? ORGANIZATION SETTINGS SCHEMA METHODS
  // ========================================
  async getOrCreateSettings(
    organizationId: string,
  ): Promise<OrganizationSettingsEntity> {
    const [existing] = await this.database.client
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    if (existing) return existing;

    const [created] = await this.database.client
      .insert(organizationSettings)
      .values({ organizationId })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    // Lost the race to a concurrent insert - read back what it created.
    const [settings] = await this.database.client
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);

    if (!settings)
      throw new Error("Failed to get or create organization settings");
    return settings;
  }

  async updateSettings(
    input: UpdateOrganizationSettingsRepoInput,
  ): Promise<OrganizationSettingsEntity> {
    const { organizationId, data } = input;
    const [updated] = await this.database.client
      .insert(organizationSettings)
      .values({ organizationId, ...data })
      .onConflictDoUpdate({
        target: organizationSettings.organizationId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();

    if (!updated) throw new Error("Failed to update organization settings");
    return updated;
  }
}
