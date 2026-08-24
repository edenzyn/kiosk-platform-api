import { Queue } from "bullmq";
import type Redis from "ioredis";
import { QueueNames } from "../../enums/core/queue-names.enum";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export type EmailJobData = SendMailOptions;

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
