import type { Worker } from "bullmq";
import { logger } from "../../utils/core/logger";
import { createEmailWorker } from "./email/email.worker";

// Mirrors jobs/register-jobs.ts. BullMQ Workers start consuming as soon as
// they're constructed (no separate `.start()` like the cron scheduler), so
// this just collects every worker instance in one place for index.ts to
// close on shutdown.
export function registerWorkers(): Worker[] {
  logger.log("[QueueWorkers] Starting workers...");

  const workers: Worker[] = [createEmailWorker()];

  logger.log("[QueueWorkers] Workers started successfully!");
  return workers;
}
