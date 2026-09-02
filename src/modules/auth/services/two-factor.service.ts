import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_LANGUAGES,
} from "../../../shared/constants/whatsapp-templates.constants";
import { NotificationChannelEnum } from "../../../shared/enums/notification/notification-channel.enum";
import { OneTimeTokenTypeEnum } from "../../../shared/enums/one-time-token/one-time-token-type.enum";
import { TwoFactorMethodEnums } from "../../../shared/enums/user/two-factor-method.enum";
import { AppError } from "../../../shared/errors/app-error";
import { compareHashedData } from "../../../shared/utils/core/bcrypt.helper";
import { getTwoFactorOtpTemplate } from "../../../shared/utils/emailTemplates/two-factor-otp.template";
import type { NotificationService } from "../../notification/notification.service";
import type { UserRepository } from "../../user/user.repository";
import type { RequiresTwoFactorServiceResult } from "../auth.types";
import type {
  DisableTwoFactorResponseDto,
  EnableTwoFactorResponseDto,
  SetupTwoFactorResponseDto,
  TwoFactorStatusResponseDto,
} from "../dtos/two-factor.dtos";
import type { OneTimeTokenService } from "./one-time-token.service";

export class TwoFactorService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly oneTimeTokenService: OneTimeTokenService,
  ) {}

  async getStatus(userId: string): Promise<TwoFactorStatusResponseDto> {
    const settings = await this.userRepository.getOrCreateSettings(userId);
    return {
      isEnabled: settings.twoFactorEnabled,
      method: settings.twoFactorMethod,
    };
  }

  /** Delivers to the destination already resolved by the caller. */
  private async _deliverCode(
    method: TwoFactorMethodEnums,
    destination: string,
    code: string,
  ): Promise<void> {
    if (method === TwoFactorMethodEnums.EMAIL) {
      const template = getTwoFactorOtpTemplate({ code });
      await this.notificationService.send(NotificationChannelEnum.EMAIL, {
        to: destination,
        ...template,
      });
      return;
    }

    await this.notificationService.send(NotificationChannelEnum.WHATSAPP, {
      to: destination,
      template: {
        name: WHATSAPP_TEMPLATES.OTP,
        languageCode: WHATSAPP_TEMPLATE_LANGUAGES.ENGLISH_US,
        bodyParams: [code, "2FA"],
        buttons: [{ index: 0, param: code }],
      },
    });
  }

  private async _requestOtp(
    userId: string,
    method: TwoFactorMethodEnums,
    type: OneTimeTokenTypeEnum,
  ): Promise<{ verificationId: string }> {
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const isEmail = method === TwoFactorMethodEnums.EMAIL;
    const channel = isEmail
      ? NotificationChannelEnum.EMAIL
      : NotificationChannelEnum.WHATSAPP;
    const destination = isEmail ? user.email : user.mobile;

    if (!destination) {
      throw new AppError(
        isEmail
          ? "No email address linked to your account"
          : "No phone number linked to your account",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const { verificationId, code } = await this.oneTimeTokenService.issue({
      userId: user.id,
      type,
      channel,
      destination,
    });

    await this._deliverCode(method, destination, code);

    return { verificationId };
  }

  async setup(
    userId: string,
    method: TwoFactorMethodEnums,
  ): Promise<SetupTwoFactorResponseDto> {
    const { verificationId } = await this._requestOtp(
      userId,
      method,
      OneTimeTokenTypeEnum.TWO_FACTOR_SETUP,
    );
    return { verificationId, method };
  }

  async enable(
    userId: string,
    verificationId: string,
    code: string,
  ): Promise<EnableTwoFactorResponseDto> {
    const { channel } = await this.oneTimeTokenService.verify({
      verificationId,
      userId,
      type: OneTimeTokenTypeEnum.TWO_FACTOR_SETUP,
      code,
    });

    const method =
      channel === NotificationChannelEnum.EMAIL
        ? TwoFactorMethodEnums.EMAIL
        : TwoFactorMethodEnums.WHATSAPP;

    await this.userRepository.updateTwoFactorAuth({
      userId,
      data: { twoFactorEnabled: true, twoFactorMethod: method },
    });

    return { message: "Two-factor authentication enabled", method };
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
      data: { twoFactorEnabled: false, twoFactorMethod: null },
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
        {
          statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        },
      );
    }

    const { verificationId } = await this._requestOtp(
      userId,
      method,
      OneTimeTokenTypeEnum.TWO_FACTOR_LOGIN,
    );
    return { requiresTwoFactor: true, verificationId, method };
  }

  async verifyLogin(
    verificationId: string,
    code: string,
  ): Promise<{ userId: string }> {
    const { userId } = await this.oneTimeTokenService.verify({
      verificationId,
      type: OneTimeTokenTypeEnum.TWO_FACTOR_LOGIN,
      code,
    });
    return { userId };
  }
}
