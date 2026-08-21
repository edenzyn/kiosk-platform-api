import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { container } from "../../../../config/container";
import { logger } from "../../../utils/core/logger";
import type { MailService } from "../../mail/mail.service";
import type { EmailJobData } from "./email.queue";
import { QueueNames } from "../../../enums/core/queue-names.enum";

// Self-resolves its dependencies from the container, matching the existing
// cron job convention (see modules/license/jobs/check-license-status.job.ts)
// rather than taking them as constructor/factory params.
export function createEmailWorker(): Worker<EmailJobData> {
  const queueConnection = container.resolve<Redis>("queueConnection");
  const mailService = container.resolve<MailService>("mailService");

  const worker = new Worker<EmailJobData>(
    QueueNames.EMAIL,
    async (job: Job<EmailJobData>) => {
      await mailService.sendMail(job.data);
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
