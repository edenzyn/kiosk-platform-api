import { eq, and, or, ilike } from "drizzle-orm";
import type { Database } from "../../config/db";
import type { users, CreateUserEntity, UserEntity } from "../user/user.schema";
import { organizations } from "../organization/organization.schema";
import { branches } from "../branch/branch.schema";

export class UserRepository {
  constructor(
    private readonly database: Database,
    private readonly userSchema: typeof users,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(this.userSchema)
      .where(eq(this.userSchema.email, email))
      .limit(1);
    return user;
  }

  async findByMobile(mobile: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(this.userSchema)
      .where(eq(this.userSchema.mobile, mobile))
      .limit(1);
    return user;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const [user] = await this.database.client
      .select()
      .from(this.userSchema)
      .where(eq(this.userSchema.id, id))
      .limit(1);
    return user;
  }

  async create(user: CreateUserEntity): Promise<UserEntity> {
    const [created] = await this.database.client
      .insert(this.userSchema)
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
  ): Promise<any[]> {
    const conditions = [];

    if (organizationId && branchId) {
      conditions.push(
        eq(this.userSchema.organizationId, organizationId),
        eq(this.userSchema.branchId, branchId),
      );
    } else if (organizationId) {
      conditions.push(eq(this.userSchema.organizationId, organizationId));
    } else if (branchId) {
      conditions.push(eq(this.userSchema.branchId, branchId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(this.userSchema.name, `%${search}%`),
          ilike(this.userSchema.email, `%${search}%`),
        ),
      );
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const query = this.database.client
      .select({
        id: this.userSchema.id,
        organizationId: this.userSchema.organizationId,
        branchId: this.userSchema.branchId,
        name: this.userSchema.name,
        email: this.userSchema.email,
        mobile: this.userSchema.mobile,
        userType: this.userSchema.userType,
        isActive: this.userSchema.isActive,
        createdAt: this.userSchema.createdAt,
        updatedAt: this.userSchema.updatedAt,
        createdBy: this.userSchema.createdBy,
        updatedBy: this.userSchema.updatedBy,
        organization: {
          id: organizations.id,
          name: organizations.name,
        },
        branch: {
          id: branches.id,
          name: branches.name,
        },
      })
      .from(this.userSchema)
      .leftJoin(
        organizations,
        eq(this.userSchema.organizationId, organizations.id),
      )
      .leftJoin(branches, eq(this.userSchema.branchId, branches.id));

    if (condition) {
      return query.where(condition);
    }
    return query;
  }
}
