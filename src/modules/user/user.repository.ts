import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import type { Database } from "../../config/db";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { branches } from "../branch/branch.schema";
import { organizations } from "../organization/organization.schema";
import { UserResponseDto } from "./dtos/get-users-response.dto";
import {
  CreateUserInvitationEntity,
  UserInvitationEntity,
  userInvitations,
} from "./schemas/user-invitations.schema";
import { CreateUserEntity, UserEntity, users } from "./schemas/user.schema";

export class UserRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findByMobile(mobile: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(users)
      .where(eq(users.mobile, mobile))
      .limit(1);
    return user;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async create(user: CreateUserEntity): Promise<UserEntity> {
    const [created] = await this.database.client
      .insert(users)
      .values(user)
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  async findByTenant(
    organizationId?: string,
    branchId?: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<{ users: UserResponseDto[]; total: number }> {
    const conditions = [];

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

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;
    return { users: rows as UserResponseDto[], total };
  }

  async createInvitation(
    invitation: CreateUserInvitationEntity,
  ): Promise<UserInvitationEntity> {
    const [created] = await this.database.client
      .insert(userInvitations)
      .values(invitation)
      .returning();

    if (!created) {
      throw new Error("Failed to create invitation");
    }
    return created;
  }

  async findInvitationByToken(
    token: string,
  ): Promise<UserInvitationEntity | undefined> {
    const [invitation] = await this.database.client
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.token, token))
      .limit(1);
    return invitation;
  }

  async findPendingInvitationByEmail(
    email: string,
  ): Promise<UserInvitationEntity | undefined> {
    const [invitation] = await this.database.client
      .select()
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.email, email),
          eq(userInvitations.status, UserInvitationStatusEnum.PENDING),
        ),
      )
      .limit(1);
    return invitation;
  }

  async updateInvitationStatus(
    id: string,
    status: number,
    updatedBy: string,
  ): Promise<UserInvitationEntity | undefined> {
    const [updated] = await this.database.client
      .update(userInvitations)
      .set({
        status,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning();

    return updated;
  }

  async findInvitationsByTenant(
    organizationId?: string,
    branchId?: string,
    page?: number,
    limit?: number,
  ): Promise<{ invitations: UserInvitationEntity[]; total: number }> {
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

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;
    return { invitations: rows, total };
  }

  async resendInvitation(
    id: string,
    token: string,
    expiresAt: Date,
    updatedBy: string,
  ): Promise<UserInvitationEntity | undefined> {
    const [updated] = await this.database.client
      .update(userInvitations)
      .set({
        token,
        expiresAt,
        status: UserInvitationStatusEnum.PENDING,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, id))
      .returning();

    return updated;
  }

  async findInvitationById(
    id: string,
  ): Promise<UserInvitationEntity | undefined> {
    const [invitation] = await this.database.client
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, id))
      .limit(1);
    return invitation;
  }
}
