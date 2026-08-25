import crypto from "node:crypto";
import { env } from "../../../../config/env";
import { HttpStatusCodes } from "../../../../shared/constants/http-status-codes.constants";
import { AppError } from "../../../../shared/errors/app-error";
import type {
  SendWhatsAppMessageOptions,
  WhatsAppApiErrorResponse,
} from "../../notification.types";

export class WhatsAppChannel {
  async sendMessage(options: SendWhatsAppMessageOptions): Promise<void> {
    const url = `${env.META_WHATSAPP_API_BASE_URL}/${env.META_WHATSAPP_API_VERSION}/${env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: options.to,
        type: "template",
        template: {
          name: options.template.name,
          language: { code: options.template.languageCode },
          components: [
            {
              type: "body",
              parameters: options.template.bodyParams.map((text) => ({
                type: "text",
                text,
              })),
            },
            ...(options.template.buttons ?? []).map((button) => ({
              type: "button",
              sub_type: "url",
              index: String(button.index),
              parameters: [{ type: "text", text: button.param }],
            })),
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as WhatsAppApiErrorResponse | null;

      console.log("[WhatsAppChannel] Failed to send message", {
        status: response.status,
        error: body?.error,
      });

      const details = body?.error?.error_data?.details;
      throw new AppError(
        [body?.error?.message, details].filter(Boolean).join(" — ") ||
          "Failed to send WhatsApp message",
        { statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE },
      );
    }
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
