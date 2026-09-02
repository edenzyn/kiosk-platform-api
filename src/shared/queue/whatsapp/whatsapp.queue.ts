import { Queue } from "bullmq";
import type Redis from "ioredis";
import { QueueNames } from "../../enums/core/queue-names.enum";
import type { SendWhatsAppMessageOptions } from "../../../modules/notification/notification.types";

export type WhatsAppJobData = SendWhatsAppMessageOptions;

export function createWhatsAppQueue(
  queueConnection: Redis,
): Queue<WhatsAppJobData> {
  return new Queue<WhatsAppJobData>(QueueNames.WHATSAPP, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  });
}
