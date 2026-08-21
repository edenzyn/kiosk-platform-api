import { Queue } from "bullmq";
import type Redis from "ioredis";
import type { SendMailOptions } from "../../mail/mail.service";
import { QueueNames } from "../../../enums/core/queue-names.enum";

export type EmailJobData = SendMailOptions;

// Param name must be `queueConnection` — awilix (CLASSIC mode) resolves
// asFunction dependencies by matching parameter names against container keys.
export function createEmailQueue(queueConnection: Redis): Queue<EmailJobData> {
  return new Queue<EmailJobData>(QueueNames.EMAIL, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  });
}
