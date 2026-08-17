import type { Msg91Config } from "../../../../config/msg91";
import { HttpStatusCodes } from "../../../constants/http-status-codes.constants";
import { AppError } from "../../../errors/app-error";
import { logger } from "../../../utils/core/logger";
import type {
  Msg91OtpResponse,
  ResendOtpOptions,
  SendOtpOptions,
  VerifyOtpOptions,
} from "./msg91-otp.types";

export class Msg91OtpService {
  constructor(private readonly msg91Config: Msg91Config) {}

  private _formatMobile(mobile: string): string {
    return mobile.trim().replace(/^\+/, "");
  }

  async sendOtp({ mobile }: SendOtpOptions): Promise<void> {
    try {
      const params = new URLSearchParams({
        template_id: this.msg91Config.otpTemplateId,
        mobile: this._formatMobile(mobile),
        authkey: this.msg91Config.authKey,
      });

      const response = await fetch(
        `${this.msg91Config.baseUrl}/otp?${params.toString()}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await response.json()) as Msg91OtpResponse;

      if (!response.ok || data.type !== "success") {
        logger.error("Failed to send OTP via MSG91", {
          status: response.status,
          response: data,
        });

        throw new AppError("Failed to send OTP. Please try again.", {
          statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
          details: data,
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Unexpected error while sending OTP via MSG91", {
        err: error,
      });

      throw new AppError("Failed to send OTP. Please try again.", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
      });
    }
  }

  async resendOtp({
    mobile,
    retryType = "text",
  }: ResendOtpOptions): Promise<void> {
    try {
      const params = new URLSearchParams({
        authkey: this.msg91Config.authKey,
        mobile: this._formatMobile(mobile),
        retrytype: retryType,
      });

      const response = await fetch(
        `${this.msg91Config.baseUrl}/otp/retry?${params.toString()}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await response.json()) as Msg91OtpResponse;

      if (!response.ok || data.type !== "success") {
        logger.error("Failed to resend OTP via MSG91", {
          status: response.status,
          response: data,
        });

        throw new AppError(
          data.message || "Failed to resend OTP. Please try again.",
          {
            statusCode: HttpStatusCodes.BAD_REQUEST,
            details: data,
          },
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Unexpected error while resending OTP via MSG91", {
        err: error,
      });

      throw new AppError("Failed to resend OTP. Please try again.", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
      });
    }
  }

  async verifyOtp({ mobile, otp }: VerifyOtpOptions): Promise<void> {
    try {
      const params = new URLSearchParams({
        authkey: this.msg91Config.authKey,
        mobile: this._formatMobile(mobile),
        otp,
      });

      const response = await fetch(
        `${this.msg91Config.baseUrl}/otp/verify?${params.toString()}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      const data = (await response.json()) as Msg91OtpResponse;

      if (!response.ok || data.type !== "success") {
        logger.warn("Invalid OTP verification attempt via MSG91", {
          status: response.status,
          response: data,
        });

        throw new AppError(data.message || "Invalid or expired OTP.", {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          details: data,
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Unexpected error while verifying OTP via MSG91", {
        err: error,
      });

      throw new AppError("Failed to verify OTP. Please try again.", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
      });
    }
  }
}
