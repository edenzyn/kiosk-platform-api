import { and, eq, ilike, isNull, or } from "drizzle-orm";
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
  ): Promise<UserResponseDto[]> {
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

    const query = this.database.client
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
      .leftJoin(branches, eq(users.branchId, branches.id));

    if (condition) {
      return query.where(condition);
    }
    return query;
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
  ): Promise<UserInvitationEntity[]> {
    const conditions = [];

    if (organizationId && branchId) {
      conditions.push(
        eq(userInvitations.organizationId, organizationId),
        eq(userInvitations.branchId, branchId),
      );
    } else if (organizationId) {
      conditions.push(eq(userInvitations.organizationId, organizationId));
    } else if (branchId) {
      conditions.push(eq(userInvitations.branchId, branchId));
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;
    const query = this.database.client.select().from(userInvitations);

    if (condition) {
      return query.where(condition);
    }
    return query;
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
