import { and, eq, isNull, lt } from "drizzle-orm";
import type { Database } from "../../config/db";
import type {
  CreateRefreshTokenRepoInput,
  CreateRefreshTokenRepoResult,
  DeleteExpiredRefreshTokensRepoInput,
  DeleteExpiredRefreshTokensRepoResult,
  RevokeRefreshTokenRepoInput,
  RevokeRefreshTokenRepoResult,
  RotateRefreshTokenRepoInput,
  RotateRefreshTokenRepoResult,
} from "./auth.types";
import { refreshTokens } from "./schemas/refresh-token.schema";

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async createRefreshToken(
    input: CreateRefreshTokenRepoInput,
  ): Promise<CreateRefreshTokenRepoResult> {
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

  async revokeRefreshToken(
    input: RevokeRefreshTokenRepoInput,
  ): Promise<RevokeRefreshTokenRepoResult> {
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

  async deleteExpiredRefreshTokens(
    input?: DeleteExpiredRefreshTokensRepoInput,
  ): Promise<DeleteExpiredRefreshTokensRepoResult> {
    const referenceDate = input?.now ?? new Date();
    const deletedRows = await this.database.client
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, referenceDate))
      .returning({ id: refreshTokens.id });

    return deletedRows.length;
  }
}
