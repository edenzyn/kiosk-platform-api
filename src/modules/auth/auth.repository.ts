import { eq } from "drizzle-orm";
import type { Database } from "../../config/db";
import { users, type NewUser, type User } from "./auth.schema";

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.database.client
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async create(user: NewUser): Promise<User> {
    const [created] = await this.database.client
      .insert(users)
      .values(user)
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }
}
