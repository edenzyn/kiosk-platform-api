import { removeAuthSessionsJob } from "../modules/auth/jobs/remove-auth-sessions.job";
import { checkLicenseStatusJob } from "../modules/license/jobs/check-license-status.job";
import { logger } from "../shared/utils/core/logger";
import { jobScheduler } from "./scheduler";

export function registerJobs(): void {
  logger.log("[JobScheduler] Registering jobs...");
  jobScheduler.registerJob(removeAuthSessionsJob);
  jobScheduler.registerJob(checkLicenseStatusJob);
  logger.log("[JobScheduler] Jobs registered successfully!");
}
