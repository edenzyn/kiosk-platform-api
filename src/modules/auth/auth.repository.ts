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
  CountOtpGenerationsRepoInput,
  DeleteOtpsRepoInput,
  FindActiveOtpRepoInput,
  FindActiveOtpRepoResult,
  UpdateOtpsRepoInput,
  UpdateOtpsRepoResult,
} from "./auth.types";
import { authSessions } from "./schemas/auth-session.schema";
import {
  otps,
  type CreateOtpEntity,
  type OtpEntity,
} from "./schemas/otp.schema";

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

  // ========================================
  // ? OTP
  // ========================================
  async createOtp(data: CreateOtpEntity): Promise<OtpEntity> {
    const [created] = await this.database.client
      .insert(otps)
      .values(data)
      .returning();

    if (!created) {
      throw new Error("Failed to create OTP");
    }
    return created;
  }

  /** An OTP is active while it is unconsumed and unexpired. */
  async findActiveOtp(
    input: FindActiveOtpRepoInput,
  ): Promise<FindActiveOtpRepoResult> {
    const [otp] = await this.database.client
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.id, input.id),
          eq(otps.type, input.type),
          ...(input.userId ? [eq(otps.userId, input.userId)] : []),
          isNull(otps.consumedAt),
          gt(otps.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return otp;
  }

  async countOtpGenerations(
    input: CountOtpGenerationsRepoInput,
  ): Promise<number> {
    const [row] = await this.database.client
      .select({ value: count() })
      .from(otps)
      .where(
        and(
          eq(otps.userId, input.userId),
          eq(otps.type, input.type),
          gte(otps.createdAt, input.since),
        ),
      );

    return row?.value ?? 0;
  }

  /**
   * Consuming a single OTP, burning every active OTP for a user+type, and
   * bumping the attempt counter are all the same write - one `where`, one
   * `set` - so they share this method.
   */
  async updateOtps(input: UpdateOtpsRepoInput): Promise<UpdateOtpsRepoResult> {
    const { where, data } = input;

    return this.database.client
      .update(otps)
      .set({
        ...(data.consumedAt !== undefined && { consumedAt: data.consumedAt }),
        ...(data.incrementAttempt && {
          attemptCount: sql`${otps.attemptCount} + 1`,
        }),
      })
      .where(
        and(
          ...(where.id ? [eq(otps.id, where.id)] : []),
          ...(where.userId ? [eq(otps.userId, where.userId)] : []),
          ...(where.type ? [eq(otps.type, where.type)] : []),
          ...(where.activeOnly ? [isNull(otps.consumedAt)] : []),
        ),
      )
      .returning();
  }

  /** Removes rows past their expiry. Driven by the cleanup job. */
  async deleteOtps(input: DeleteOtpsRepoInput): Promise<number> {
    const rows = await this.database.client
      .delete(otps)
      .where(lt(otps.expiresAt, input.expiredBefore))
      .returning({ id: otps.id });

    return rows.length;
  }
}
