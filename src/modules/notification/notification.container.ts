import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

export class NotificationContainer {
  static register(container: AwilixContainer): void {
    container.register({
      notificationService: asClass(NotificationService).singleton(),
      notificationController: asClass(NotificationController).singleton(),
    });
  }
}
