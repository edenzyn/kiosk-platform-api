import type { Worker } from "bullmq";
import { logger } from "../utils/core/logger";
import { createEmailWorker } from "./email/email.worker";
import { createWhatsAppWorker } from "./whatsapp/whatsapp.worker";

export function registerWorkers(): Worker[] {
  logger.log("[QueueWorkers] Starting workers...");

  const workers: Worker[] = [createEmailWorker(), createWhatsAppWorker()];

  logger.log("[QueueWorkers] Workers started successfully!");
  return workers;
}
