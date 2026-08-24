import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { EmailChannel } from "./channels/email/email.channel";
import { WhatsAppChannel } from "./channels/whatsapp/whatsapp.channel";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

export class NotificationContainer {
  static register(container: AwilixContainer): void {
    container.register({
      emailChannel: asClass(EmailChannel).singleton(),
      whatsappChannel: asClass(WhatsAppChannel).singleton(),
      notificationService: asClass(NotificationService).singleton(),
      notificationController: asClass(NotificationController).singleton(),
    });
  }
}
