import { and, asc, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import type { Database } from "../../config/db";
import type {
  CreateRefreshTokenRepoInput,
  CreateRefreshTokenRepoResult,
  ListSessionsRepoInput,
  ListSessionsRepoResult,
  RemoveAuthSessionsRepoInput,
  RemoveAuthSessionsRepoResult,
  RevokeOldestSessionsRepoInput,
  RevokeOldestSessionsRepoResult,
  RevokeOtherSessionsRepoInput,
  RevokeOtherSessionsRepoResult,
  RevokeRefreshTokenRepoInput,
  RevokeRefreshTokenRepoResult,
  RevokeSessionRepoInput,
  RevokeSessionRepoResult,
  RotateRefreshTokenRepoInput,
  RotateRefreshTokenRepoResult,
} from "./auth.types";
import { authSessions } from "./schemas/auth-session.schema";

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async createRefreshToken(
    input: CreateRefreshTokenRepoInput,
  ): Promise<CreateRefreshTokenRepoResult> {
    await this.database.client.insert(authSessions).values(input.data);
  }

  async rotateRefreshToken(
    input: RotateRefreshTokenRepoInput,
  ): Promise<RotateRefreshTokenRepoResult> {
    const { currentTokenId, currentTokenHash, replacement } = input;
    return this.database.client.transaction(async (transaction) => {
      const [revoked] = await transaction
        .update(authSessions)
        .set({
          revokedAt: new Date(),
          replacedByTokenId: replacement.id,
        })
        .where(
          and(
            eq(authSessions.id, currentTokenId),
            eq(authSessions.tokenHash, currentTokenHash),
            isNull(authSessions.revokedAt),
          ),
        )
        .returning();

      if (!revoked) return false;

      await transaction.insert(authSessions).values({
        ipAddress: revoked.ipAddress,
        userAgent: revoked.userAgent,
        deviceName: revoked.deviceName,
        ...replacement,
        lastUsedAt: new Date(),
      });
      return true;
    });
  }

  async revokeRefreshToken(
    input: RevokeRefreshTokenRepoInput,
  ): Promise<RevokeRefreshTokenRepoResult> {
    const { tokenId, tokenHash } = input;
    await this.database.client
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.id, tokenId),
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ),
      );
  }

  async removeAuthSessions(
    input?: RemoveAuthSessionsRepoInput,
  ): Promise<RemoveAuthSessionsRepoResult> {
    const referenceDate = input?.now ?? new Date();
    const deletedRows = await this.database.client
      .delete(authSessions)
      .where(lt(authSessions.expiresAt, referenceDate))
      .returning({ id: authSessions.id });

    return deletedRows.length;
  }

  async listSessions(
    input: ListSessionsRepoInput,
  ): Promise<ListSessionsRepoResult> {
    return this.database.client
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, input.userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(asc(authSessions.createdAt));
  }

  async revokeSession(
    input: RevokeSessionRepoInput,
  ): Promise<RevokeSessionRepoResult> {
    const [revoked] = await this.database.client
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.id, input.sessionId),
          eq(authSessions.userId, input.userId),
          isNull(authSessions.revokedAt),
        ),
      )
      .returning({ id: authSessions.id });

    return Boolean(revoked);
  }

  async revokeOtherSessions(
    input: RevokeOtherSessionsRepoInput,
  ): Promise<RevokeOtherSessionsRepoResult> {
    const revokedRows = await this.database.client
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.userId, input.userId),
          ne(authSessions.id, input.keepSessionId),
          isNull(authSessions.revokedAt),
        ),
      )
      .returning({ id: authSessions.id });

    return revokedRows.length;
  }

  async revokeOldestSessions(
    input: RevokeOldestSessionsRepoInput,
  ): Promise<RevokeOldestSessionsRepoResult> {
    if (input.count <= 0) return;

    const oldest = await this.database.client
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, input.userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(asc(authSessions.createdAt))
      .limit(input.count);

    if (oldest.length === 0) return;

    await this.database.client
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        inArray(
          authSessions.id,
          oldest.map((row) => row.id),
        ),
      );
  }
}
