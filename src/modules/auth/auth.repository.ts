import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import ms from "ms";
import type { Database } from "../../config/db";
import { env } from "../../config/env";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { RedisProvider } from "../../shared/providers/redis/redis.provider";
import type {
  CreateRefreshTokenRepoInput,
  CreateRefreshTokenRepoResult,
  FindActiveDeviceSessionRepoInput,
  FindActiveDeviceSessionRepoResult,
  ListDeviceSessionsRepoInput,
  ListDeviceSessionsRepoResult,
  ListSessionsRepoInput,
  ListSessionsRepoResult,
  RemoveAuthSessionsRepoInput,
  RemoveAuthSessionsRepoResult,
  RevokeDeviceSessionsRepoInput,
  RevokeDeviceSessionsRepoResult,
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
import { DatabaseError } from "../../shared/errors/database-error";
import { logger } from "../../shared/utils/core/logger";

export class AuthRepository {
  constructor(
    private readonly database: Database,
    private readonly redisProvider: RedisProvider,
  ) {}

  private async _denylistSession(sessionId: string): Promise<void> {
    try {
      // Outlives the longest access token, user or device, issued for a session.
      const ttlSeconds = Math.ceil(
        Math.max(
          ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
          ms(env.JWT_DEVICE_ACCESS_EXPIRES_IN as ms.StringValue),
        ) / 1000,
      );
      await this.redisProvider.set(
        RedisKeys.authSessionRevoked(sessionId),
        "1",
        ttlSeconds,
      );
    } catch (error) {
      logger.error("[AUTH__DENYLIST_SESSION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async createRefreshToken(
    input: CreateRefreshTokenRepoInput,
  ): Promise<CreateRefreshTokenRepoResult> {
    try {
      await this.database.client.insert(authSessions).values(input.data);
    } catch (error) {
      logger.error("[AUTH_CREATE_REFRESH_TOKEN_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async rotateRefreshToken(
    input: RotateRefreshTokenRepoInput,
  ): Promise<RotateRefreshTokenRepoResult> {
    try {
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

      return await Boolean(updated);
    } catch (error) {
      logger.error("[AUTH_ROTATE_REFRESH_TOKEN_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async revokeRefreshToken(
    input: RevokeRefreshTokenRepoInput,
  ): Promise<RevokeRefreshTokenRepoResult> {
    try {
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
    } catch (error) {
      logger.error("[AUTH_REVOKE_REFRESH_TOKEN_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async removeAuthSessions(
    input?: RemoveAuthSessionsRepoInput,
  ): Promise<RemoveAuthSessionsRepoResult> {
    try {
      const referenceDate = input?.now ?? new Date();
      const deletedRows = await this.database.client
        .delete(authSessions)
        .where(lt(authSessions.expiresAt, referenceDate))
        .returning({ id: authSessions.id });

      return await deletedRows.length;
    } catch (error) {
      logger.error("[AUTH_REMOVE_AUTH_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async listSessions(
    input: ListSessionsRepoInput,
  ): Promise<ListSessionsRepoResult> {
    try {
      return await this.database.client
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
    } catch (error) {
      logger.error("[AUTH_LIST_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async revokeSession(
    input: RevokeSessionRepoInput,
  ): Promise<RevokeSessionRepoResult> {
    try {
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
      return await Boolean(revoked);
    } catch (error) {
      logger.error("[AUTH_REVOKE_SESSION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async revokeOtherSessions(
    input: RevokeOtherSessionsRepoInput,
  ): Promise<RevokeOtherSessionsRepoResult> {
    try {
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

      await Promise.all(
        revokedRows.map((row) => this._denylistSession(row.id)),
      );
      return await revokedRows.length;
    } catch (error) {
      logger.error("[AUTH_REVOKE_OTHER_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async listDeviceSessions(
    input: ListDeviceSessionsRepoInput,
  ): Promise<ListDeviceSessionsRepoResult> {
    try {
      return await this.database.client
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.deviceId, input.deviceId),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
          ),
        )
        .orderBy(asc(authSessions.createdAt));
    } catch (error) {
      logger.error("[AUTH_LIST_DEVICE_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async findActiveDeviceSession(
    input: FindActiveDeviceSessionRepoInput,
  ): Promise<FindActiveDeviceSessionRepoResult> {
    try {
      const [session] = await this.database.client
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.deviceId, input.deviceId),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(authSessions.lastUsedAt))
        .limit(1);

      return session ?? null;
    } catch (error) {
      logger.error("[AUTH_FIND_ACTIVE_DEVICE_SESSION_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async revokeDeviceSessions(
    input: RevokeDeviceSessionsRepoInput,
  ): Promise<RevokeDeviceSessionsRepoResult> {
    try {
      const revokedRows = await this.database.client
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authSessions.deviceId, input.deviceId),
            isNull(authSessions.revokedAt),
          ),
        )
        .returning({ id: authSessions.id });

      await Promise.all(
        revokedRows.map((row) => this._denylistSession(row.id)),
      );
      return revokedRows.length;
    } catch (error) {
      logger.error("[AUTH_REVOKE_DEVICE_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async revokeOldestSessions(
    input: RevokeOldestSessionsRepoInput,
  ): Promise<RevokeOldestSessionsRepoResult> {
    try {
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
    } catch (error) {
      logger.error("[AUTH_REVOKE_OLDEST_SESSIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  // ========================================
  // ? ONE-TIME TOKENS
  // ========================================
  async createOneTimeToken(
    data: CreateOneTimeTokenEntity,
  ): Promise<OneTimeTokenEntity> {
    try {
      const [created] = await this.database.client
        .insert(oneTimeTokens)
        .values(data)
        .returning();

      if (!created) {
        throw new Error("Failed to create one-time token");
      }
      return await created;
    } catch (error) {
      logger.error("[AUTH_CREATE_ONE_TIME_TOKEN_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  /** A token is active while it is unconsumed and unexpired. */
  async findActiveOneTimeToken(
    input: FindActiveOneTimeTokenRepoInput,
  ): Promise<FindActiveOneTimeTokenRepoResult> {
    try {
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

      return await record;
    } catch (error) {
      logger.error("[AUTH_FIND_ACTIVE_ONE_TIME_TOKEN_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async countOneTimeTokenGenerations(
    input: CountOneTimeTokenGenerationsRepoInput,
  ): Promise<number> {
    try {
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

      return (await row?.value) ?? 0;
    } catch (error) {
      logger.error("[AUTH_COUNT_ONE_TIME_TOKEN_GENERATIONS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  /**
   * Consuming a single token, burning every active token for a user+type, and
   * bumping the attempt counter are all the same write - one `where`, one
   * `set` - so they share this method.
   */
  async updateOneTimeTokens(
    input: UpdateOneTimeTokensRepoInput,
  ): Promise<UpdateOneTimeTokensRepoResult> {
    try {
      const { where, data } = input;

      return await this.database.client
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
    } catch (error) {
      logger.error("[AUTH_UPDATE_ONE_TIME_TOKENS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  /** Removes rows past their expiry. Driven by the cleanup job. */
  async deleteOneTimeTokens(
    input: DeleteOneTimeTokensRepoInput,
  ): Promise<number> {
    try {
      const rows = await this.database.client
        .delete(oneTimeTokens)
        .where(lt(oneTimeTokens.expiresAt, input.expiredBefore))
        .returning({ id: oneTimeTokens.id });

      return await rows.length;
    } catch (error) {
      logger.error("[AUTH_DELETE_ONE_TIME_TOKENS_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }
}
