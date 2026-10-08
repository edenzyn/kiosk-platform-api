import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { branches } from "../branch/schemas/branch.schema";
import { branchSettings } from "../branch/schemas/branch-settings.schema";
import { resellerMarketMapper } from "../market/schemas/reseller-market-mapper.schema";
import { organizations } from "../organization/schemas/organization.schema";
import { organizationSettings } from "../organization/schemas/organization-settings.schema";
import { userRolesMapper } from "../rbac/schemas/user-roles-mapper.schema";
import type { UserResponseDto } from "./dtos/get-users.dtos";
import { userInvitations } from "./schemas/user-invitations.schema";
import {
  userSettings,
  type UserSettingsEntity,
} from "./schemas/user-settings.schema";
import { users, type UserEntity } from "./schemas/user.schema";
import type {
  CreateUserInvitationRepoInput,
  CreateUserInvitationRepoResult,
  CreateUserRepoInput,
  CreateUserRepoResult,
  FindInvitationsByTenantRepoInput,
  FindInvitationsByTenantRepoResult,
  FindOneInvitationRepoInput,
  FindOneInvitationRepoResult,
  FindOneUserRepoInput,
  FindOneUserRepoResult,
  FindResellersRepoInput,
  FindResellersRepoResult,
  FindUserByTenantRepoInput,
  FindUserByTenantRepoResult,
  FindUsersByRoleIdRepoInput,
  FindUsersByRoleIdRepoResult,
  UpdateTwoFactorAuthRepoInput,
  UpdateTwoFactorAuthRepoResult,
  UpdateUserInvitationRepoInput,
  UpdateUserInvitationRepoResult,
  UpdateUserRepoInput,
  UpdateUserRepoResult,
  UpdateUserSettingsRepoInput,
  UpdateUserSettingsRepoResult,
} from "./user.types";
import { DatabaseError } from "../../shared/errors/database-error";
import { logger } from "../../shared/utils/core/logger";

export class UserRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? USER SCHEMA METHODS
  // ========================================
  async findOne(input: FindOneUserRepoInput): Promise<FindOneUserRepoResult> {
    try {
      const conditions: (SQL | undefined)[] = [];

      if (input.id !== undefined) conditions.push(eq(users.id, input.id));
      if (input.email !== undefined)
        conditions.push(eq(users.email, input.email));
      if (input.mobile !== undefined)
        conditions.push(eq(users.mobile, input.mobile));
      if (input.organizationId !== undefined) {
        conditions.push(
          input.organizationId === null
            ? isNull(users.organizationId)
            : eq(users.organizationId, input.organizationId),
        );
      }
      if (input.branchId !== undefined) {
        conditions.push(
          input.branchId === null
            ? isNull(users.branchId)
            : eq(users.branchId, input.branchId),
        );
      }
      if (input.userType !== undefined) {
        conditions.push(eq(users.userType, input.userType));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(users.isActive, input.isActive));
      }

      if (conditions.length === 0) {
        return await undefined;
      }

      const [user] = await this.database.client
        .select()
        .from(users)
        .where(and(...conditions))
        .limit(1);

      return await user;
    } catch (error) {
      logger.error("[USER_FIND_ONE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findByTenant(
    input: FindUserByTenantRepoInput,
  ): Promise<FindUserByTenantRepoResult> {
    try {
      const {
        organizationId,
        branchId,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = input;
      const conditions: (SQL | undefined)[] = [];

      if (organizationId && branchId) {
        conditions.push(
          eq(users.organizationId, organizationId),
          eq(users.branchId, branchId),
        );
      } else if (organizationId) {
        conditions.push(
          eq(users.organizationId, organizationId),
          isNull(users.branchId),
        );
      }

      if (search) {
        conditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          ),
        );
      }

      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      // Count query
      const countQuery = this.database.client
        .select({ count: count() })
        .from(users);
      const [countResult] = condition
        ? await countQuery.where(condition)
        : await countQuery;
      const total = Number(countResult?.count || 0);

      // Select query
      let query = this.database.client
        .select({
          id: users.id,
          organizationId: users.organizationId,
          branchId: users.branchId,
          name: users.name,
          email: users.email,
          mobile: users.mobile,
          userType: users.userType,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          createdBy: users.createdBy,
          updatedBy: users.updatedBy,
          organization: {
            id: organizations.id,
            name: organizations.name,
          },
          branch: {
            id: branches.id,
            name: branches.name,
          },
        })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .leftJoin(branches, eq(users.branchId, branches.id))
        .$dynamic();

      if (condition) {
        query = query.where(condition);
      }

      if (sortBy && sortOrder) {
        const orderFn = sortOrder === SortingOrderEnum.ASC ? asc : desc;
        if (sortBy === "name") {
          query = query.orderBy(orderFn(users.name));
        } else if (sortBy === "userType") {
          query = query.orderBy(orderFn(users.userType));
        } else if (sortBy === "isActive") {
          query = query.orderBy(orderFn(users.isActive));
        } else if (sortBy === "createdAt") {
          query = query.orderBy(orderFn(users.createdAt));
        }
      } else {
        query = query.orderBy(desc(users.createdAt));
      }

      if (page && limit) {
        query = query.limit(limit).offset((page - 1) * limit);
      }

      const rows = await query;
      return await { users: rows as UserResponseDto[], total };
    } catch (error) {
      logger.error("[USER_FIND_BY_TENANT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findUsersByRoleId(
    input: FindUsersByRoleIdRepoInput,
  ): Promise<FindUsersByRoleIdRepoResult> {
    try {
      const { roleId, organizationId, branchId, search, page, limit } = input;
      const ru = input.ru !== false;

      const conditions: (SQL | undefined)[] = [];

      if (ru) {
        conditions.push(eq(userRolesMapper.roleId, roleId));
      } else {
        conditions.push(isNull(userRolesMapper.roleId));
      }

      if (organizationId && branchId) {
        conditions.push(
          eq(users.organizationId, organizationId),
          eq(users.branchId, branchId),
        );
      } else if (organizationId) {
        conditions.push(
          eq(users.organizationId, organizationId),
          isNull(users.branchId),
        );
      }

      if (search) {
        conditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          ),
        );
      }

      let countQuery;
      let baseQuery;

      if (ru) {
        countQuery = this.database.client
          .select({ count: count() })
          .from(userRolesMapper)
          .innerJoin(users, eq(userRolesMapper.userId, users.id))
          .where(and(...conditions));

        baseQuery = this.database.client
          .select({
            id: users.id,
            organizationId: users.organizationId,
            branchId: users.branchId,
            name: users.name,
            email: users.email,
            mobile: users.mobile,
            userType: users.userType,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(userRolesMapper)
          .innerJoin(users, eq(userRolesMapper.userId, users.id))
          .where(and(...conditions))
          .$dynamic();
      } else {
        countQuery = this.database.client
          .select({ count: count() })
          .from(users)
          .leftJoin(
            userRolesMapper,
            and(
              eq(userRolesMapper.userId, users.id),
              eq(userRolesMapper.roleId, roleId),
            ),
          )
          .where(and(...conditions));

        baseQuery = this.database.client
          .select({
            id: users.id,
            organizationId: users.organizationId,
            branchId: users.branchId,
            name: users.name,
            email: users.email,
            mobile: users.mobile,
            userType: users.userType,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .leftJoin(
            userRolesMapper,
            and(
              eq(userRolesMapper.userId, users.id),
              eq(userRolesMapper.roleId, roleId),
            ),
          )
          .where(and(...conditions))
          .$dynamic();
      }

      const [countResult] = await countQuery;
      const total = Number(countResult?.count || 0);

      let query = baseQuery;
      if (page && limit) {
        query = query.limit(limit).offset((page - 1) * limit);
      }

      const rows = await query;
      return await {
        users: rows as Omit<
          UserEntity,
          "password" | "createdBy" | "updatedBy"
        >[],
        total,
      };
    } catch (error) {
      logger.error("[USER_FIND_USERS_BY_ROLE_ID_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async create(input: CreateUserRepoInput): Promise<CreateUserRepoResult> {
    try {
      const [created] = await this.database.client
        .insert(users)
        .values(input.user)
        .returning();

      if (!created) {
        throw new Error("Failed to create user");
      }
      return await created;
    } catch (error) {
      logger.error("[USER_CREATE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findResellers(
    input: FindResellersRepoInput,
  ): Promise<FindResellersRepoResult> {
    try {
      const { search, isActive, marketId, page, limit, sortBy, sortOrder } =
        input;

      const conditions: (SQL | undefined)[] = [
        eq(users.userType, UserTypeEnums.RESELLER),
      ];

      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      }

      if (search) {
        conditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          ),
        );
      }

      if (marketId) {
        conditions.push(
          inArray(
            users.id,
            this.database.client
              .select({ resellerId: resellerMarketMapper.resellerId })
              .from(resellerMarketMapper)
              .where(
                and(
                  eq(resellerMarketMapper.marketId, marketId),
                  eq(resellerMarketMapper.isActive, true),
                ),
              ),
          ),
        );
      }

      const condition = and(...conditions);

      const [countResult] = await this.database.client
        .select({ count: count() })
        .from(users)
        .where(condition);
      const total = Number(countResult?.count || 0);

      let query = this.database.client
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mobile: users.mobile,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(condition)
        .$dynamic();

      if (sortBy && sortOrder) {
        const orderFn = sortOrder === SortingOrderEnum.ASC ? asc : desc;
        if (sortBy === "name") {
          query = query.orderBy(orderFn(users.name));
        } else if (sortBy === "isActive") {
          query = query.orderBy(orderFn(users.isActive));
        } else if (sortBy === "createdAt") {
          query = query.orderBy(orderFn(users.createdAt));
        }
      } else {
        query = query.orderBy(desc(users.createdAt));
      }

      if (page && limit) {
        query = query.limit(limit).offset((page - 1) * limit);
      }

      const resellers = await query;
      return await { resellers, total };
    } catch (error) {
      logger.error("[USER_FIND_RESELLERS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async update(input: UpdateUserRepoInput): Promise<UpdateUserRepoResult> {
    try {
      const [updated] = await this.database.client
        .update(users)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      if (!updated) {
        throw new Error("Failed to update user");
      }
      return await updated;
    } catch (error) {
      logger.error("[USER_UPDATE_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  // ========================================
  // ? USER INVITATION SCHEMA METHODS
  // ========================================
  async findOneInvitation(
    input: FindOneInvitationRepoInput,
  ): Promise<FindOneInvitationRepoResult> {
    try {
      const conditions: (SQL | undefined)[] = [];

      if (input.id !== undefined) {
        conditions.push(eq(userInvitations.id, input.id));
      }
      if (input.email !== undefined) {
        conditions.push(eq(userInvitations.email, input.email));
      }
      if (input.token !== undefined) {
        conditions.push(eq(userInvitations.token, input.token));
      }
      if (input.status !== undefined) {
        conditions.push(eq(userInvitations.status, input.status));
      }
      if (input.organizationId !== undefined) {
        conditions.push(
          input.organizationId === null
            ? isNull(userInvitations.organizationId)
            : eq(userInvitations.organizationId, input.organizationId),
        );
      }
      if (input.branchId !== undefined) {
        conditions.push(
          input.branchId === null
            ? isNull(userInvitations.branchId)
            : eq(userInvitations.branchId, input.branchId),
        );
      }

      if (conditions.length === 0) {
        return await undefined;
      }

      const [invitation] = await this.database.client
        .select()
        .from(userInvitations)
        .where(and(...conditions))
        .limit(1);

      return await invitation;
    } catch (error) {
      logger.error("[USER_FIND_ONE_INVITATION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findInvitationsByTenant(
    input: FindInvitationsByTenantRepoInput,
  ): Promise<FindInvitationsByTenantRepoResult> {
    try {
      const {
        organizationId,
        branchId,
        entityType,
        isOrgRegistration,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        status,
        expiresStart,
        expiresEnd,
      } = input;
      const conditions = [];

      if (organizationId && branchId) {
        conditions.push(
          eq(userInvitations.organizationId, organizationId),
          eq(userInvitations.branchId, branchId),
        );
      } else if (organizationId) {
        conditions.push(
          eq(userInvitations.organizationId, organizationId),
          isNull(userInvitations.branchId),
        );
      } else if (branchId) {
        conditions.push(eq(userInvitations.branchId, branchId));
      }

      if (search) {
        conditions.push(ilike(userInvitations.email, `%${search}%`));
      }

      if (status !== undefined && status !== null) {
        conditions.push(eq(userInvitations.status, status));
      }

      if (expiresStart) {
        conditions.push(gte(userInvitations.expiresAt, expiresStart));
      }

      if (expiresEnd) {
        conditions.push(lte(userInvitations.expiresAt, expiresEnd));
      }

      if (entityType !== undefined && entityType !== null) {
        conditions.push(eq(userInvitations.entityType, entityType));
      }

      if (isOrgRegistration !== undefined) {
        conditions.push(
          eq(userInvitations.isOrgRegistration, isOrgRegistration),
        );
      }

      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      // Count query
      const countQuery = this.database.client
        .select({ count: count() })
        .from(userInvitations);
      const [countResult] = condition
        ? await countQuery.where(condition)
        : await countQuery;
      const total = Number(countResult?.count || 0);

      // Select query
      let query = this.database.client
        .select()
        .from(userInvitations)
        .$dynamic();

      if (condition) {
        query = query.where(condition);
      }

      if (sortBy && sortOrder) {
        const orderFn = sortOrder === SortingOrderEnum.ASC ? asc : desc;
        if (sortBy === "email") {
          query = query.orderBy(orderFn(userInvitations.email));
        } else if (sortBy === "status") {
          query = query.orderBy(orderFn(userInvitations.status));
        } else if (sortBy === "expiresAt") {
          query = query.orderBy(orderFn(userInvitations.expiresAt));
        } else if (sortBy === "createdAt") {
          query = query.orderBy(orderFn(userInvitations.createdAt));
        }
      } else {
        query = query.orderBy(desc(userInvitations.createdAt));
      }

      if (page && limit) {
        query = query.limit(limit).offset((page - 1) * limit);
      }

      const rows = await query;
      return await { invitations: rows, total };
    } catch (error) {
      logger.error("[USER_FIND_INVITATIONS_BY_TENANT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async createInvitation(
    input: CreateUserInvitationRepoInput,
  ): Promise<CreateUserInvitationRepoResult> {
    try {
      const [created] = await this.database.client
        .insert(userInvitations)
        .values(input.invitation)
        .returning();

      if (!created) {
        throw new Error("Failed to create invitation");
      }
      return await created;
    } catch (error) {
      logger.error("[USER_CREATE_INVITATION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async updateInvitation(
    input: UpdateUserInvitationRepoInput,
  ): Promise<UpdateUserInvitationRepoResult> {
    try {
      const { id, data } = input;
      const [updated] = await this.database.client
        .update(userInvitations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userInvitations.id, id))
        .returning();

      return await updated;
    } catch (error) {
      logger.error("[USER_UPDATE_INVITATION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  // ========================================
  // ? USER SETTINGS SCHEMA METHODS
  // ========================================
  async getOrCreateSettings(input: {
    userId: string;
    organizationId?: string | null;
    branchId?: string | null;
  }): Promise<UserSettingsEntity> {
    try {
      const { userId, organizationId, branchId } = input;

      const [existing] = await this.database.client
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (existing) return await existing;

      const inheritedSettings = branchId
        ? (
            await this.database.client
              .select()
              .from(branchSettings)
              .where(eq(branchSettings.branchId, branchId))
              .limit(1)
          )[0]
        : organizationId
          ? (
              await this.database.client
                .select()
                .from(organizationSettings)
                .where(eq(organizationSettings.organizationId, organizationId))
                .limit(1)
            )[0]
          : undefined;

      const [created] = await this.database.client
        .insert(userSettings)
        .values({
          userId,
          primaryColor: inheritedSettings?.primaryColor,
          languageCode: inheritedSettings?.languageCode,
        })
        .onConflictDoNothing()
        .returning();

      if (created) return await created;

      // Lost the race to a concurrent insert - read back what it created.
      const [settings] = await this.database.client
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!settings) throw new Error("Failed to get or create user settings");
      return await settings;
    } catch (error) {
      logger.error("[USER_GET_OR_CREATE_SETTINGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async updateSettings(
    input: UpdateUserSettingsRepoInput,
  ): Promise<UpdateUserSettingsRepoResult> {
    try {
      const { userId, data } = input;
      const [updated] = await this.database.client
        .insert(userSettings)
        .values({ userId, ...data })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { ...data, updatedAt: new Date() },
        })
        .returning();

      if (!updated) throw new Error("Failed to update user settings");
      return await updated;
    } catch (error) {
      logger.error("[USER_UPDATE_SETTINGS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  // ========================================
  // ? USER TWO-FACTOR AUTH FIELDS (on user_settings)
  // ========================================
  async updateTwoFactorAuth(
    input: UpdateTwoFactorAuthRepoInput,
  ): Promise<UpdateTwoFactorAuthRepoResult> {
    try {
      const { userId, data } = input;
      const [updated] = await this.database.client
        .insert(userSettings)
        .values({ userId, ...data })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { ...data, updatedAt: new Date() },
        })
        .returning();

      if (!updated) throw new Error("Failed to update two-factor settings");
      return await updated;
    } catch (error) {
      logger.error("[USER_UPDATE_TWO_FACTOR_AUTH_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }
}
