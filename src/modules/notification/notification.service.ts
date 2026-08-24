import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { logger } from "../../shared/utils/core/logger";
import type {
  EmailChannel,
  SendMailOptions,
} from "./channels/email/email.channel";
import type {
  SendWhatsAppMessageOptions,
  WhatsAppChannel,
} from "./channels/whatsapp/whatsapp.channel";

export class NotificationService {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly whatsappChannel: WhatsAppChannel,
  ) {}

  async send(
    channel: NotificationChannelEnum,
    options: SendMailOptions | SendWhatsAppMessageOptions,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannelEnum.EMAIL:
        return this.emailChannel.sendMail(options as SendMailOptions);
      case NotificationChannelEnum.WHATSAPP:
        return this.whatsappChannel.sendMessage(
          options as SendWhatsAppMessageOptions,
        );
    }
  }

  verifyWhatsAppChallenge(mode: string, token: string): boolean {
    return this.whatsappChannel.verifyChallenge(mode, token);
  }

  verifyWhatsAppSignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    return this.whatsappChannel.verifySignature(rawBody, signatureHeader);
  }

  async handleWhatsAppWebhookEvent(payload: unknown): Promise<void> {
    logger.log(
      `[NotificationService] Received WhatsApp webhook event: ${JSON.stringify(payload)}`,
    );
  }
}
