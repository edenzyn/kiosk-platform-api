import { eq } from "drizzle-orm";
import type { Database } from "../../config/db";
import type { users, CreateUserEntity, UserEntity } from "../user/user.schema";

export class AuthRepository {
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
}
