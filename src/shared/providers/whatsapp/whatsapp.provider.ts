import crypto from "node:crypto";
import type { WhatsAppClientConfig } from "../../../config/whatsapp";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { AppError } from "../../errors/app-error";
import type {
  SendWhatsAppMessageOptions,
  WhatsAppApiErrorResponse,
} from "../../../modules/notification/notification.types";
import { logger } from "../../utils/core/logger";

export class WhatsAppProvider {
  constructor(private readonly whatsappClientConfig: WhatsAppClientConfig) {}

  async sendMessage(options: SendWhatsAppMessageOptions): Promise<void> {
    const url = `${this.whatsappClientConfig.apiBaseUrl}/${this.whatsappClientConfig.apiVersion}/${this.whatsappClientConfig.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.whatsappClientConfig.accessToken}`,
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

      logger.error("[WhatsAppProvider] Failed to send message", {
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
    return (
      mode === "subscribe" && token === this.whatsappClientConfig.verifyToken
    );
  }

  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    if (!rawBody || !signatureHeader) return false;

    const expected = `sha256=${crypto
      .createHmac("sha256", this.whatsappClientConfig.appSecret)
      .update(rawBody)
      .digest("hex")}`;

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signatureHeader);
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }
}
