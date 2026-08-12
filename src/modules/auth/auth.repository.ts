import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../config/db";
import { refreshTokens } from "./schemas/refresh-token.schema";
import type {
  CreateRefreshTokenRepoInput,
  CreateRefreshTokenRepoResult,
  RotateRefreshTokenRepoInput,
  RotateRefreshTokenRepoResult,
  RevokeRefreshTokenRepoInput,
  RevokeRefreshTokenRepoResult,
} from "./auth.types";

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async createRefreshToken(input: CreateRefreshTokenRepoInput): Promise<CreateRefreshTokenRepoResult> {
    await this.database.client.insert(refreshTokens).values(input.data);
  }

  async rotateRefreshToken(
    input: RotateRefreshTokenRepoInput,
  ): Promise<RotateRefreshTokenRepoResult> {
    const { currentTokenId, currentTokenHash, replacement } = input;
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

  async revokeRefreshToken(input: RevokeRefreshTokenRepoInput): Promise<RevokeRefreshTokenRepoResult> {
    const { tokenId, tokenHash } = input;
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
