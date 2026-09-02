import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { container } from "../../../config/container";
import { JobNames } from "../../enums/core/job-names.enum";
import { QueueNames } from "../../enums/core/queue-names.enum";
import { logger } from "../../utils/core/logger";
import type { WhatsAppProvider } from "../../providers/whatsapp/whatsapp.provider";
import type { WhatsAppJobData } from "./whatsapp.queue";

export function createWhatsAppWorker(): Worker<WhatsAppJobData> {
  const queueConnection = container.resolve<Redis>("queueConnection");
  const whatsappProvider =
    container.resolve<WhatsAppProvider>("whatsappProvider");

  const worker = new Worker<WhatsAppJobData>(
    QueueNames.WHATSAPP,
    async (job: Job<WhatsAppJobData>) => {
      switch (job.name) {
        case JobNames.SEND_WHATSAPP:
          await whatsappProvider.sendMessage(job.data);
          return;
        default:
          throw new Error(`Unknown job name for whatsapp queue: ${job.name}`);
      }
    },
    { connection: queueConnection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error(`WhatsApp job ${job?.id} failed`, err);
  });

  worker.on("error", (err) => {
    logger.error("WhatsApp worker error", err);
  });

  return worker;
}
