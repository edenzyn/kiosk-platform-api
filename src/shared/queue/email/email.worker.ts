import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { container } from "../../../config/container";
import { QueueNames } from "../../enums/core/queue-names.enum";
import { NotificationChannelEnum } from "../../enums/notification/notification-channel.enum";
import { logger } from "../../utils/core/logger";
import type { NotificationService } from "../../../modules/notification/notification.service";
import type { EmailJobData } from "./email.queue";

export function createEmailWorker(): Worker<EmailJobData> {
  const queueConnection = container.resolve<Redis>("queueConnection");
  const notificationService =
    container.resolve<NotificationService>("notificationService");

  const worker = new Worker<EmailJobData>(
    QueueNames.EMAIL,
    async (job: Job<EmailJobData>) => {
      await notificationService.send(NotificationChannelEnum.EMAIL, job.data);
    },
    { connection: queueConnection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error(`Email job ${job?.id} failed`, { err: err.message });
  });

  worker.on("error", (err) => {
    logger.error("Email worker error", { err: err.message });
  });

  return worker;
}
