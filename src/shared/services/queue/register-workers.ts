import type { Worker } from "bullmq";
import { logger } from "../../utils/core/logger";
import { createEmailWorker } from "./email/email.worker";

export function registerWorkers(): Worker[] {
  logger.log("[QueueWorkers] Starting workers...");

  const workers: Worker[] = [createEmailWorker()];

  logger.log("[QueueWorkers] Workers started successfully!");
  return workers;
}
