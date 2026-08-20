import { and, asc, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import ms from "ms";
import type { Database } from "../../config/db";
import { env } from "../../config/env";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { RedisService } from "../../shared/services/redis/redis.service";
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
  constructor(
    private readonly database: Database,
    private readonly redisService: RedisService,
  ) {}

  private async _denylistSession(sessionId: string): Promise<void> {
    const ttlSeconds = Math.ceil(
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue) / 1000,
    );
    await this.redisService.set(
      RedisKeys.authSessionRevoked(sessionId),
      "1",
      ttlSeconds,
    );
  }

  async createRefreshToken(
    input: CreateRefreshTokenRepoInput,
  ): Promise<CreateRefreshTokenRepoResult> {
    await this.database.client.insert(authSessions).values(input.data);
  }

  async rotateRefreshToken(
    input: RotateRefreshTokenRepoInput,
  ): Promise<RotateRefreshTokenRepoResult> {
    const [updated] = await this.database.client
      .update(authSessions)
      .set({
        tokenHash: input.newTokenHash,
        expiresAt: input.newExpiresAt,
        lastUsedAt: new Date(),
      })
      .where(
        and(
          eq(authSessions.id, input.sessionId),
          eq(authSessions.tokenHash, input.currentTokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .returning({ id: authSessions.id });

    return Boolean(updated);
  }

  async revokeRefreshToken(
    input: RevokeRefreshTokenRepoInput,
  ): Promise<RevokeRefreshTokenRepoResult> {
    const { tokenId, tokenHash } = input;
    const [revoked] = await this.database.client
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.id, tokenId),
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ),
      )
      .returning({ id: authSessions.id });

    if (revoked) await this._denylistSession(revoked.id);
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

    if (revoked) await this._denylistSession(revoked.id);
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

    await Promise.all(revokedRows.map((row) => this._denylistSession(row.id)));
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

    await Promise.all(oldest.map((row) => this._denylistSession(row.id)));
  }
}
