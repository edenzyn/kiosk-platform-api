import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { branches } from "../branch/branch.schema";
import { organizations } from "../organization/organization.schema";
import { userRolesMapper } from "../rbac/schemas/user-roles-mapper.schema";
import type { UserResponseDto } from "./dtos/get-users.dtos";
import { userInvitations } from "./schemas/user-invitations.schema";
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
  FindUserByTenantRepoInput,
  FindUserByTenantRepoResult,
  FindUsersByRoleIdRepoInput,
  FindUsersByRoleIdRepoResult,
  UpdateUserInvitationRepoInput,
  UpdateUserInvitationRepoResult,
} from "./user.types";

export class UserRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? USER SCHEMA METHODS
  // ========================================
  async findOne(input: FindOneUserRepoInput): Promise<FindOneUserRepoResult> {
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
      return undefined;
    }

    const [user] = await this.database.client
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return user;
  }

  async findByTenant(
    input: FindUserByTenantRepoInput,
  ): Promise<FindUserByTenantRepoResult> {
    const { organizationId, branchId, search, page, limit, sortBy, sortOrder } =
      input;
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
        or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)),
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
    return { users: rows as UserResponseDto[], total };
  }

  async findUsersByRoleId(
    input: FindUsersByRoleIdRepoInput,
  ): Promise<FindUsersByRoleIdRepoResult> {
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
        or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)),
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
    return {
      users: rows as Pick<
        UserEntity,
        | "id"
        | "organizationId"
        | "branchId"
        | "name"
        | "email"
        | "mobile"
        | "userType"
        | "isActive"
        | "createdAt"
        | "updatedAt"
      >[],
      total,
    };
  }

  async create(input: CreateUserRepoInput): Promise<CreateUserRepoResult> {
    const [created] = await this.database.client
      .insert(users)
      .values(input.user)
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  // ========================================
  // ? USER INVITATION SCHEMA METHODS
  // ========================================
  async findOneInvitation(
    input: FindOneInvitationRepoInput,
  ): Promise<FindOneInvitationRepoResult> {
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
      return undefined;
    }

    const [invitation] = await this.database.client
      .select()
      .from(userInvitations)
      .where(and(...conditions))
      .limit(1);

    return invitation;
  }

  async findInvitationsByTenant(
    input: FindInvitationsByTenantRepoInput,
  ): Promise<FindInvitationsByTenantRepoResult> {
    const {
      organizationId,
      branchId,
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

    if (status !== undefined) {
      conditions.push(eq(userInvitations.status, status));
    }

    if (expiresStart) {
      conditions.push(gte(userInvitations.expiresAt, expiresStart));
    }

    if (expiresEnd) {
      conditions.push(lte(userInvitations.expiresAt, expiresEnd));
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
    let query = this.database.client.select().from(userInvitations).$dynamic();

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
    return { invitations: rows, total };
  }

  async createInvitation(
    input: CreateUserInvitationRepoInput,
  ): Promise<CreateUserInvitationRepoResult> {
    const [created] = await this.database.client
      .insert(userInvitations)
      .values(input.invitation)
      .returning();

    if (!created) {
      throw new Error("Failed to create invitation");
    }
    return created;
  }

  async updateInvitation(
    input: UpdateUserInvitationRepoInput,
  ): Promise<UpdateUserInvitationRepoResult> {
    const { id, data } = input;
    const [updated] = await this.database.client
      .update(userInvitations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning();

    return updated;
  }
}
