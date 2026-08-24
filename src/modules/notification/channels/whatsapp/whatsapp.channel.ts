import crypto from "node:crypto";
import { env } from "../../../../config/env";
import { HttpStatusCodes } from "../../../../shared/constants/http-status-codes.constants";
import { AppError } from "../../../../shared/errors/app-error";

export interface SendWhatsAppMessageOptions {
  to: string;
  message: string;
}

export class WhatsAppChannel {
  async sendMessage(options: SendWhatsAppMessageOptions): Promise<void> {
    if (env.NODE_ENV !== "production") {
      console.log(`[WhatsAppChannel] To ${options.to}: ${options.message}`);
      return;
    }

    throw new AppError(
      "WhatsApp verification is not available right now. Please use email instead.",
      { statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE },
    );
  }

  verifyChallenge(mode: string, token: string): boolean {
    return mode === "subscribe" && token === env.META_WHATSAPP_VERIFY_TOKEN;
  }

  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    if (!rawBody || !signatureHeader) return false;

    const expected = `sha256=${crypto
      .createHmac("sha256", env.META_WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest("hex")}`;

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signatureHeader);
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }
}
