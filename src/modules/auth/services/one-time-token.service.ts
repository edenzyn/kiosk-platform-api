import dayjs from "dayjs";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ONE_TIME_TOKEN_CONSTANTS } from "../../../shared/constants/one-time-token.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { OneTimeTokenTypeEnum } from "../../../shared/enums/one-time-token/one-time-token-type.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  createRandomReadableCode,
  hmacSha256,
} from "../../../shared/utils/core/crypto.helper";
import { pluralizeByCount } from "../../../shared/utils/core/string.helper";
import type { AuthRepository } from "../auth.repository";
import type {
  IssueOneTimeTokenServiceInput,
  IssueOneTimeTokenServiceResult,
  VerifyOneTimeTokenServiceInput,
  VerifyOneTimeTokenServiceResult,
} from "../auth.types";

/**
 * How each token type is minted. Link tokens are long, alphanumeric and
 * longer-lived because they are single-factor — whoever holds the link holds
 * the account — and are never typed by hand. Everything else is a short numeric
 * code the user reads off a message and enters into an attempt-limited form.
 */
const TOKEN_SHAPE_BY_TYPE: Partial<
  Record<
    OneTimeTokenTypeEnum,
    { length: number; isNumeric: boolean; expiryMinutes: number }
  >
> = {
  [OneTimeTokenTypeEnum.PASSWORD_RESET]: {
    length: ONE_TIME_TOKEN_CONSTANTS.RESET_TOKEN_LENGTH,
    isNumeric: false,
    expiryMinutes: ONE_TIME_TOKEN_CONSTANTS.RESET_TOKEN_EXPIRY_MINUTES,
  },
};

const DEFAULT_TOKEN_SHAPE = {
  length: ONE_TIME_TOKEN_CONSTANTS.CODE_LENGTH,
  isNumeric: true,
  expiryMinutes: ONE_TIME_TOKEN_CONSTANTS.EXPIRY_MINUTES,
};

export class OneTimeTokenService {
  constructor(private readonly authRepository: AuthRepository) {}

  /** Marks a single token consumed so it can never be redeemed again. */
  private async _burn(id: string): Promise<void> {
    await this.authRepository.updateOneTimeTokens({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  private _hashToken(code: string): string {
    return hmacSha256(code.trim().toUpperCase(), env.ONE_TIME_TOKEN_SECRET);
  }

  /**
   * Issues a code for a user+type, enforcing the per-(user, type) generation
   * allowance. Any previously active code for the same user+type is burned, so
   * only the newest code can be redeemed.
   *
   * Returns the plaintext code for the caller to deliver — it is never stored.
   */
  async issue(input: IssueOneTimeTokenServiceInput): Promise<IssueOneTimeTokenServiceResult> {
    const windowStart = dayjs()
      .subtract(ONE_TIME_TOKEN_CONSTANTS.GENERATION_WINDOW_MINUTES, "minute")
      .toDate();

    const generations = await this.authRepository.countOneTimeTokenGenerations({
      userId: input.userId,
      type: input.type,
      since: windowStart,
    });

    if (generations >= ONE_TIME_TOKEN_CONSTANTS.MAX_GENERATIONS_PER_WINDOW) {
      throw new AppError(
        "Too many verification codes requested. Please try again later.",
        {
          statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
          code: ErrorCodes.TOO_MANY_REQUESTS,
        },
      );
    }

    await this.authRepository.updateOneTimeTokens({
      where: { userId: input.userId, type: input.type, activeOnly: true },
      data: { consumedAt: new Date() },
    });

    const shape = TOKEN_SHAPE_BY_TYPE[input.type] ?? DEFAULT_TOKEN_SHAPE;

    const code = createRandomReadableCode(shape.length, {
      isNumeric: shape.isNumeric,
    });

    const record = await this.authRepository.createOneTimeToken({
      userId: input.userId,
      type: input.type,
      channel: input.channel,
      destination: input.destination,
      tokenHash: this._hashToken(code),
      expiresAt: dayjs()
        .add(shape.expiryMinutes, "minute")
        .toDate(),
    });

    return { verificationId: record.id, code };
  }

  /**
   * Verifies a secret against an active token. A wrong value counts against
   * the token's attempt allowance; exhausting it burns the token so the
   * remaining keyspace can't be walked. A correct value consumes it (single use).
   */
  async verify(input: VerifyOneTimeTokenServiceInput): Promise<VerifyOneTimeTokenServiceResult> {
    const record = await this.authRepository.findActiveOneTimeToken({
      id: input.verificationId,
      userId: input.userId,
      type: input.type,
    });

    if (!record) {
      throw new AppError(
        "This verification session has expired. Please start over.",
        { statusCode: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    if (record.attemptCount >= ONE_TIME_TOKEN_CONSTANTS.MAX_VERIFY_ATTEMPTS) {
      await this._burn(record.id);
      throw new AppError(
        "Too many incorrect attempts. Please request a new code.",
        {
          statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
          code: ErrorCodes.TOO_MANY_REQUESTS,
        },
      );
    }

    if (this._hashToken(input.code) !== record.tokenHash) {
      const [updated] = await this.authRepository.updateOneTimeTokens({
        where: { id: record.id },
        data: { incrementAttempt: true },
      });

      const attemptsRemaining = Math.max(
        0,
        ONE_TIME_TOKEN_CONSTANTS.MAX_VERIFY_ATTEMPTS - (updated?.attemptCount ?? 0),
      );

      if (attemptsRemaining === 0) {
        await this._burn(record.id);
        throw new AppError(
          "Too many incorrect attempts. Please request a new code.",
          {
            statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
            code: ErrorCodes.TOO_MANY_REQUESTS,
          },
        );
      }

      throw new AppError(
        `Invalid verification code. ${pluralizeByCount(
          attemptsRemaining,
          "attempt",
        )} remaining.`,
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          details: { attemptsRemaining },
        },
      );
    }

    await this._burn(record.id);

    return {
      userId: record.userId,
      destination: record.destination,
      channel: record.channel,
    };
  }
}
