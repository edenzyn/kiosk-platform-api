import { checkLicenseStatusJob } from "../modules/license/jobs/check-license-status.job";
import { logger } from "../shared/utils/core/logger";
import { jobScheduler } from "./scheduler";

export function registerJobs(): void {
  logger.log("[JobScheduler] Registering jobs...");
  // jobScheduler.registerJob(clearExpiredRefreshTokensJob);
  jobScheduler.registerJob(checkLicenseStatusJob);
  logger.log("[JobScheduler] Jobs registered successfully!");
}
