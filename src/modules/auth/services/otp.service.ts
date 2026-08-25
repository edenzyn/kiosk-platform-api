import dayjs from "dayjs";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { OTP_CONSTANTS } from "../../../shared/constants/otp.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  createRandomReadableCode,
  hmacSha256,
} from "../../../shared/utils/core/crypto.helper";
import type { AuthRepository } from "../auth.repository";
import type {
  IssueOtpServiceInput,
  IssueOtpServiceResult,
  VerifyOtpServiceInput,
  VerifyOtpServiceResult,
} from "../auth.types";

export class OtpService {
  constructor(private readonly authRepository: AuthRepository) {}

  /** Marks a single OTP consumed so it can never be redeemed again. */
  private async _burn(id: string): Promise<void> {
    await this.authRepository.updateOtps({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  private _hashCode(code: string): string {
    return hmacSha256(code.trim().toUpperCase(), env.OTP_CODE_SECRET);
  }

  /**
   * Issues a code for a user+type, enforcing the per-(user, type) generation
   * allowance. Any previously active code for the same user+type is burned, so
   * only the newest code can be redeemed.
   *
   * Returns the plaintext code for the caller to deliver — it is never stored.
   */
  async issue(input: IssueOtpServiceInput): Promise<IssueOtpServiceResult> {
    const windowStart = dayjs()
      .subtract(OTP_CONSTANTS.GENERATION_WINDOW_MINUTES, "minute")
      .toDate();

    const generations = await this.authRepository.countOtpGenerations({
      userId: input.userId,
      type: input.type,
      since: windowStart,
    });

    if (generations >= OTP_CONSTANTS.MAX_GENERATIONS_PER_WINDOW) {
      throw new AppError(
        `Too many verification codes requested. Please try again in ${OTP_CONSTANTS.GENERATION_WINDOW_MINUTES} minutes.`,
        {
          statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
          code: ErrorCodes.TOO_MANY_REQUESTS,
        },
      );
    }

    await this.authRepository.updateOtps({
      where: { userId: input.userId, type: input.type, activeOnly: true },
      data: { consumedAt: new Date() },
    });

    const code = createRandomReadableCode(OTP_CONSTANTS.CODE_LENGTH, {
      isNumeric: true,
    });

    const otp = await this.authRepository.createOtp({
      userId: input.userId,
      type: input.type,
      channel: input.channel,
      destination: input.destination,
      codeHash: this._hashCode(code),
      expiresAt: dayjs().add(OTP_CONSTANTS.EXPIRY_MINUTES, "minute").toDate(),
    });

    return {
      verificationId: otp.id,
      code,
      // `generations` was counted before this insert, so add it back in.
      resendsRemaining:
        OTP_CONSTANTS.MAX_GENERATIONS_PER_WINDOW - (generations + 1),
    };
  }

  /**
   * Verifies a code against an active OTP. A wrong code counts against the
   * OTP's attempt allowance; exhausting it burns the code so the remaining
   * keyspace can't be walked. A correct code consumes the OTP (single use).
   */
  async verify(input: VerifyOtpServiceInput): Promise<VerifyOtpServiceResult> {
    const otp = await this.authRepository.findActiveOtp({
      id: input.verificationId,
      userId: input.userId,
      type: input.type,
    });

    if (!otp) {
      throw new AppError(
        "This verification session has expired. Please start over.",
        { statusCode: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    if (otp.attemptCount >= OTP_CONSTANTS.MAX_VERIFY_ATTEMPTS) {
      await this._burn(otp.id);
      throw new AppError(
        "Too many incorrect attempts. Please request a new code.",
        {
          statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
          code: ErrorCodes.TOO_MANY_REQUESTS,
        },
      );
    }

    if (this._hashCode(input.code) !== otp.codeHash) {
      const [updated] = await this.authRepository.updateOtps({
        where: { id: otp.id },
        data: { incrementAttempt: true },
      });

      if ((updated?.attemptCount ?? 0) >= OTP_CONSTANTS.MAX_VERIFY_ATTEMPTS) {
        await this._burn(otp.id);
        throw new AppError(
          "Too many incorrect attempts. Please request a new code.",
          {
            statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
            code: ErrorCodes.TOO_MANY_REQUESTS,
          },
        );
      }

      throw new AppError("Invalid verification code", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    await this._burn(otp.id);

    return {
      userId: otp.userId,
      destination: otp.destination,
      channel: otp.channel,
    };
  }
}
