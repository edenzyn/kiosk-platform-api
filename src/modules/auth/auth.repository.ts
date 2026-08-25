import { and, asc, count, eq, gt, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import ms from "ms";
import type { Database } from "../../config/db";
import { env } from "../../config/env";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { RedisProvider } from "../../shared/providers/redis/redis.provider";
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
  CountOneTimeTokenGenerationsRepoInput,
  DeleteOneTimeTokensRepoInput,
  FindActiveOneTimeTokenRepoInput,
  FindActiveOneTimeTokenRepoResult,
  UpdateOneTimeTokensRepoInput,
  UpdateOneTimeTokensRepoResult,
} from "./auth.types";
import { authSessions } from "./schemas/auth-session.schema";
import {
  oneTimeTokens,
  type CreateOneTimeTokenEntity,
  type OneTimeTokenEntity,
} from "./schemas/one-time-token.schema";

export class AuthRepository {
  constructor(
    private readonly database: Database,
    private readonly redisProvider: RedisProvider,
  ) {}

  private async _denylistSession(sessionId: string): Promise<void> {
    const ttlSeconds = Math.ceil(
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue) / 1000,
    );
    await this.redisProvider.set(
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
          ...(input.keepSessionId
            ? [ne(authSessions.id, input.keepSessionId)]
            : []),
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

  // ========================================
  // ? ONE-TIME TOKENS
  // ========================================
  async createOneTimeToken(data: CreateOneTimeTokenEntity): Promise<OneTimeTokenEntity> {
    const [created] = await this.database.client
      .insert(oneTimeTokens)
      .values(data)
      .returning();

    if (!created) {
      throw new Error("Failed to create one-time token");
    }
    return created;
  }

  /** A token is active while it is unconsumed and unexpired. */
  async findActiveOneTimeToken(
    input: FindActiveOneTimeTokenRepoInput,
  ): Promise<FindActiveOneTimeTokenRepoResult> {
    const [record] = await this.database.client
      .select()
      .from(oneTimeTokens)
      .where(
        and(
          eq(oneTimeTokens.id, input.id),
          eq(oneTimeTokens.type, input.type),
          ...(input.userId ? [eq(oneTimeTokens.userId, input.userId)] : []),
          isNull(oneTimeTokens.consumedAt),
          gt(oneTimeTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return record;
  }

  async countOneTimeTokenGenerations(
    input: CountOneTimeTokenGenerationsRepoInput,
  ): Promise<number> {
    const [row] = await this.database.client
      .select({ value: count() })
      .from(oneTimeTokens)
      .where(
        and(
          eq(oneTimeTokens.userId, input.userId),
          eq(oneTimeTokens.type, input.type),
          gte(oneTimeTokens.createdAt, input.since),
        ),
      );

    return row?.value ?? 0;
  }

  /**
   * Consuming a single token, burning every active token for a user+type, and
   * bumping the attempt counter are all the same write - one `where`, one
   * `set` - so they share this method.
   */
  async updateOneTimeTokens(input: UpdateOneTimeTokensRepoInput): Promise<UpdateOneTimeTokensRepoResult> {
    const { where, data } = input;

    return this.database.client
      .update(oneTimeTokens)
      .set({
        ...(data.consumedAt !== undefined && { consumedAt: data.consumedAt }),
        ...(data.incrementAttempt && {
          attemptCount: sql`${oneTimeTokens.attemptCount} + 1`,
        }),
      })
      .where(
        and(
          ...(where.id ? [eq(oneTimeTokens.id, where.id)] : []),
          ...(where.userId ? [eq(oneTimeTokens.userId, where.userId)] : []),
          ...(where.type ? [eq(oneTimeTokens.type, where.type)] : []),
          ...(where.activeOnly ? [isNull(oneTimeTokens.consumedAt)] : []),
        ),
      )
      .returning();
  }

  /** Removes rows past their expiry. Driven by the cleanup job. */
  async deleteOneTimeTokens(input: DeleteOneTimeTokensRepoInput): Promise<number> {
    const rows = await this.database.client
      .delete(oneTimeTokens)
      .where(lt(oneTimeTokens.expiresAt, input.expiredBefore))
      .returning({ id: oneTimeTokens.id });

    return rows.length;
  }
}
