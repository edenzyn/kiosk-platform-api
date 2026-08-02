import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../config/db";
import {
  refreshTokens,
  type CreateRefreshTokenEntity,
} from "./schemas/refresh-token.schema";

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async createRefreshToken(data: CreateRefreshTokenEntity): Promise<void> {
    await this.database.client.insert(refreshTokens).values(data);
  }

  async rotateRefreshToken(
    currentTokenId: string,
    currentTokenHash: string,
    replacement: CreateRefreshTokenEntity,
  ): Promise<boolean> {
    return this.database.client.transaction(async (transaction) => {
      const [revoked] = await transaction
        .update(refreshTokens)
        .set({
          revokedAt: new Date(),
          replacedByTokenId: replacement.id,
        })
        .where(
          and(
            eq(refreshTokens.id, currentTokenId),
            eq(refreshTokens.tokenHash, currentTokenHash),
            isNull(refreshTokens.revokedAt),
          ),
        )
        .returning({ id: refreshTokens.id });

      if (!revoked) return false;

      await transaction.insert(refreshTokens).values(replacement);
      return true;
    });
  }

  async revokeRefreshToken(tokenId: string, tokenHash: string): Promise<void> {
    await this.database.client
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.id, tokenId),
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }
}
