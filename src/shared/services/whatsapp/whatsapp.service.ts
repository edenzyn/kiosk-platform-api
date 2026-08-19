import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { AppError } from "../../errors/app-error";

export interface SendWhatsAppMessageOptions {
  to: string;
  message: string;
}

/**
 * No WhatsApp provider (Twilio, Meta Cloud API, etc.) is wired up yet - this
 * only logs in development so OTP-via-WhatsApp is exercisable locally.
 * Swap the body of sendMessage for a real provider call when one is chosen.
 */
export class WhatsAppService {
  async sendMessage(options: SendWhatsAppMessageOptions): Promise<void> {
    if (env.NODE_ENV !== "production") {
      console.log(`[WhatsAppService] To ${options.to}: ${options.message}`);
      return;
    }

    throw new AppError(
      "WhatsApp verification is not available right now. Please use email instead.",
      { statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE },
    );
  }
}
