import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { container } from "../../../config/container";
import { JobNames } from "../../enums/core/job-names.enum";
import { QueueNames } from "../../enums/core/queue-names.enum";
import { logger } from "../../utils/core/logger";
import type { EmailProvider } from "../../providers/email/email.provider";
import type { EmailJobData } from "./email.queue";

export function createEmailWorker(): Worker<EmailJobData> {
  const queueConnection = container.resolve<Redis>("queueConnection");
  const emailProvider = container.resolve<EmailProvider>("emailProvider");

  const worker = new Worker<EmailJobData>(
    QueueNames.EMAIL,
    async (job: Job<EmailJobData>) => {
      switch (job.name) {
        case JobNames.SEND_EMAIL:
          await emailProvider.sendMail(job.data);
          return;
        default:
          throw new Error(`Unknown job name for email queue: ${job.name}`);
      }
    },
    { connection: queueConnection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error(`Email job ${job?.id} failed`, err);
  });

  worker.on("error", (err) => {
    logger.error("Email worker error", err);
  });

  return worker;
}
