import type jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { TwoFactorMethodEnums } from "../../../shared/enums/user/two-factor-method.enum";
import { AppError } from "../../../shared/errors/app-error";
import type { MailService } from "../../../shared/services/mail/mail.service";
import { getTwoFactorOtpTemplate } from "../../../shared/services/mail/templates/two-factor-otp.template";
import type { TotpService } from "../../../shared/services/totp/totp.service";
import type { WhatsAppService } from "../../../shared/services/whatsapp/whatsapp.service";
import { compareHashedData } from "../../../shared/utils/core/bcrypt.helper";
import {
  createRandomReadableCode,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import {
  generateToken,
  verifyToken,
} from "../../../shared/utils/core/jwt.helper";
import type { UserEntity } from "../../user/schemas/user.schema";
import type { UserRepository } from "../../user/user.repository";
import {
  TwoFactorTokenPurposeEnums,
  type RequiresTwoFactorServiceResult,
  type TwoFactorOtpTokenPayload,
  type TwoFactorPendingLoginTokenPayload,
  type TwoFactorTotpSetupTokenPayload,
} from "../auth.types";
import type {
  DisableTwoFactorResponseDto,
  EnableTwoFactorResponseDto,
  SetupTwoFactorResponseDto,
  TwoFactorStatusResponseDto,
} from "../dtos/two-factor.dtos";

type OtpPurpose =
  | TwoFactorTokenPurposeEnums.OTP_SETUP
  | TwoFactorTokenPurposeEnums.OTP_LOGIN;

type PeekedTwoFactorToken = jwt.JwtPayload & {
  purpose?: TwoFactorTokenPurposeEnums;
  userId?: string;
  secret?: string;
  method?: TwoFactorMethodEnums;
  codeHash?: string;
};

export class TwoFactorService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly totpService: TotpService,
  ) {}

  private static readonly OTP_LENGTH = 6;
  private static readonly BACKUP_CODE_COUNT = 8;
  private static readonly BACKUP_CODE_LENGTH = 8;

  async getStatus(userId: string): Promise<TwoFactorStatusResponseDto> {
    const settings = await this.userRepository.getOrCreateSettings(userId);
    return {
      isEnabled: settings.twoFactorEnabled,
      method: settings.twoFactorMethod,
    };
  }

  private async _deliverCode(
    user: UserEntity,
    method: TwoFactorMethodEnums,
    code: string,
  ): Promise<void> {
    if (method === TwoFactorMethodEnums.EMAIL) {
      const template = getTwoFactorOtpTemplate({ code });
      await this.mailService.sendMail({ to: user.email, ...template });
      return;
    }

    if (!user.mobile) {
      throw new AppError("No phone number linked to your account", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    await this.whatsAppService.sendMessage({
      to: user.mobile,
      message: `Your ${env.APP_NAME} verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  private async _requestOtp(
    userId: string,
    method: TwoFactorMethodEnums,
    purpose: OtpPurpose,
  ): Promise<{ otpToken: string }> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const code = createRandomReadableCode(TwoFactorService.OTP_LENGTH);
    const payload: TwoFactorOtpTokenPayload = {
      purpose,
      userId: user.id,
      method,
      codeHash: hashSha256(code),
    };
    const otpToken = generateToken(payload, env.JWT_2FA_SECRET, {
      expiresIn: env.JWT_2FA_OTP_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    await this._deliverCode(user, method, code);

    return { otpToken };
  }

  private _extractOtpPayload(
    peeked: PeekedTwoFactorToken,
    code: string,
    purpose: OtpPurpose,
  ): { userId: string; method: TwoFactorMethodEnums } {
    if (
      peeked.purpose !== purpose ||
      !peeked.userId ||
      !peeked.method ||
      !peeked.codeHash
    ) {
      throw new AppError("Invalid verification session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    if (hashSha256(code.trim().toUpperCase()) !== peeked.codeHash) {
      throw new AppError("Invalid verification code", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    return { userId: peeked.userId, method: peeked.method };
  }

  private async _setupTotp(userId: string): Promise<SetupTwoFactorResponseDto> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const secret = this.totpService.generateSecret();
    const keyUri = this.totpService.buildKeyUri(user.email, secret);
    const qrCodeDataUrl = await this.totpService.generateQrCodeDataUrl(keyUri);

    const payload: TwoFactorTotpSetupTokenPayload = {
      purpose: TwoFactorTokenPurposeEnums.TOTP_SETUP,
      userId,
      secret,
    };
    const otpToken = generateToken(payload, env.JWT_2FA_SECRET, {
      expiresIn:
        env.JWT_2FA_TOTP_SETUP_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return {
      otpToken,
      method: TwoFactorMethodEnums.AUTHENTICATOR,
      qrCodeDataUrl,
      manualEntryCode: secret,
    };
  }

  async setup(
    userId: string,
    method: TwoFactorMethodEnums,
  ): Promise<SetupTwoFactorResponseDto> {
    if (method === TwoFactorMethodEnums.AUTHENTICATOR) {
      return this._setupTotp(userId);
    }

    const { otpToken } = await this._requestOtp(
      userId,
      method,
      TwoFactorTokenPurposeEnums.OTP_SETUP,
    );
    return { otpToken, method };
  }

  private _generateBackupCodes(): { codes: string[]; hashes: string[] } {
    const codes = Array.from(
      { length: TwoFactorService.BACKUP_CODE_COUNT },
      () => createRandomReadableCode(TwoFactorService.BACKUP_CODE_LENGTH),
    );
    const hashes = codes.map((code) => hashSha256(code));
    return { codes, hashes };
  }

  async enable(
    userId: string,
    otpToken: string,
    code: string,
  ): Promise<EnableTwoFactorResponseDto> {
    let peeked: PeekedTwoFactorToken;
    try {
      peeked = verifyToken(otpToken, env.JWT_2FA_SECRET);
    } catch {
      throw new AppError(
        "This verification session has expired. Please start over.",
        { statusCode: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    if (peeked.purpose === TwoFactorTokenPurposeEnums.TOTP_SETUP) {
      if (peeked.userId !== userId || !peeked.secret) {
        throw new AppError("Invalid verification session.", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
        });
      }

      if (!this.totpService.verify(code, peeked.secret)) {
        throw new AppError("Invalid verification code", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
        });
      }

      const { codes, hashes } = this._generateBackupCodes();

      await this.userRepository.updateTwoFactorAuth({
        userId,
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: TwoFactorMethodEnums.AUTHENTICATOR,
          twoFactorSecret: peeked.secret,
          twoFactorBackupCodeHashes: hashes,
        },
      });

      return {
        message: "Two-factor authentication enabled",
        method: TwoFactorMethodEnums.AUTHENTICATOR,
        backupCodes: codes,
      };
    }

    const { userId: verifiedUserId, method } = this._extractOtpPayload(
      peeked,
      code,
      TwoFactorTokenPurposeEnums.OTP_SETUP,
    );

    if (verifiedUserId !== userId) {
      throw new AppError("Invalid verification session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    await this.userRepository.updateTwoFactorAuth({
      userId,
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        twoFactorSecret: null,
        twoFactorBackupCodeHashes: null,
      },
    });

    return { message: "Two-factor authentication enabled", method };
  }

  private async _consumeBackupCodeIfValid(
    userId: string,
    code: string,
    hashes: string[] | null,
  ): Promise<boolean> {
    if (!hashes?.length) return false;

    const codeHash = hashSha256(code.trim().toUpperCase());

    const index = hashes.findIndex((storedHash) => {
      const storedBuffer = Buffer.from(storedHash, "hex");
      const providedBuffer = Buffer.from(codeHash, "hex");

      return (
        storedBuffer.length === providedBuffer.length &&
        crypto.timingSafeEqual(storedBuffer, providedBuffer)
      );
    });

    if (index === -1) return false;

    const remaining = hashes.filter((_, i) => i !== index);

    await this.userRepository.updateTwoFactorAuth({
      userId,
      data: {
        twoFactorBackupCodeHashes: remaining,
      },
    });

    return true;
  }

  async disable(
    userId: string,
    password: string,
  ): Promise<DisableTwoFactorResponseDto> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const isMatch = await compareHashedData(password, user.password);
    if (!isMatch) {
      throw new AppError("Incorrect password", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    await this.userRepository.updateTwoFactorAuth({
      userId,
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        twoFactorBackupCodeHashes: null,
      },
    });

    return { message: "Two-factor authentication disabled" };
  }

  async requestLoginChallenge(
    userId: string,
    method: TwoFactorMethodEnums | null,
  ): Promise<RequiresTwoFactorServiceResult> {
    if (!method) {
      throw new AppError(
        "Two-factor authentication method is not configured.",
        { statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR },
      );
    }

    if (method === TwoFactorMethodEnums.AUTHENTICATOR) {
      const payload: TwoFactorPendingLoginTokenPayload = {
        purpose: TwoFactorTokenPurposeEnums.PENDING_LOGIN,
        userId,
      };
      const twoFactorToken = generateToken(payload, env.JWT_2FA_SECRET, {
        expiresIn:
          env.JWT_2FA_PENDING_LOGIN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      });
      return { requiresTwoFactor: true, twoFactorToken, method };
    }

    const { otpToken } = await this._requestOtp(
      userId,
      method,
      TwoFactorTokenPurposeEnums.OTP_LOGIN,
    );
    return { requiresTwoFactor: true, twoFactorToken: otpToken, method };
  }

  async verifyLogin(
    twoFactorToken: string,
    code: string,
  ): Promise<{ userId: string }> {
    let peeked: PeekedTwoFactorToken;
    try {
      peeked = verifyToken(twoFactorToken, env.JWT_2FA_SECRET);
    } catch {
      throw new AppError(
        "Invalid or expired verification session. Please log in again.",
        { statusCode: HttpStatusCodes.UNAUTHORIZED },
      );
    }

    if (peeked.purpose === TwoFactorTokenPurposeEnums.PENDING_LOGIN) {
      if (!peeked.userId) {
        throw new AppError("Invalid verification session.", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
        });
      }

      const settings = await this.userRepository.getOrCreateSettings(
        peeked.userId,
      );
      const isValidTotp = settings.twoFactorSecret
        ? this.totpService.verify(code, settings.twoFactorSecret)
        : false;

      if (!isValidTotp) {
        const usedBackupCode = await this._consumeBackupCodeIfValid(
          peeked.userId,
          code,
          settings.twoFactorBackupCodeHashes,
        );
        if (!usedBackupCode) {
          throw new AppError("Invalid verification code", {
            statusCode: HttpStatusCodes.BAD_REQUEST,
          });
        }
      }

      return { userId: peeked.userId };
    }

    const verified = this._extractOtpPayload(
      peeked,
      code,
      TwoFactorTokenPurposeEnums.OTP_LOGIN,
    );
    return { userId: verified.userId };
  }
}
