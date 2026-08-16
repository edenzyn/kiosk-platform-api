import { clearExpiredRefreshTokensJob } from "../modules/auth/jobs/clear-expired-refresh-tokens.job";
import { logger } from "../shared/utils/core/logger";
import { jobScheduler } from "./scheduler";

export function registerJobs(): void {
  logger.log("[JobScheduler] Registering jobs...");
  jobScheduler.registerJob(clearExpiredRefreshTokensJob);
  logger.log("[JobScheduler] Jobs registered successfully!");
}
