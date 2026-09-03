import type { Queue } from "bullmq";
import { JobNames } from "../../shared/enums/core/job-names.enum";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import type { WhatsAppProvider } from "../../shared/providers/whatsapp/whatsapp.provider";
import type {
  EmailJobData,
  SendMailOptions,
} from "../../shared/queue/email/email.queue";
import type { WhatsAppJobData } from "../../shared/queue/whatsapp/whatsapp.queue";
import { logger } from "../../shared/utils/core/logger";
import { SendWhatsAppMessageOptions } from "./notification.types";

export class NotificationService {
  constructor(
    private readonly emailQueue: Queue<EmailJobData>,
    private readonly whatsappQueue: Queue<WhatsAppJobData>,
    private readonly whatsappProvider: WhatsAppProvider,
  ) {}

  async send(
    channel: NotificationChannelEnum,
    options: SendMailOptions | SendWhatsAppMessageOptions,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannelEnum.EMAIL:
        await this.emailQueue.add(
          JobNames.SEND_EMAIL,
          options as SendMailOptions,
        );
        return;
      case NotificationChannelEnum.WHATSAPP:
        await this.whatsappQueue.add(
          JobNames.SEND_WHATSAPP,
          options as SendWhatsAppMessageOptions,
        );
        return;
    }
  }

  verifyWhatsAppChallenge(mode: string, token: string): boolean {
    return this.whatsappProvider.verifyChallenge(mode, token);
  }

  verifyWhatsAppSignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    return this.whatsappProvider.verifySignature(rawBody, signatureHeader);
  }

  async handleWhatsAppWebhookEvent(payload: unknown): Promise<void> {
    logger.log(
      `[NotificationService] Received WhatsApp webhook event: ${JSON.stringify(payload)}`,
    );
  }
}
