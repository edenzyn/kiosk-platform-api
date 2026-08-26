import { removeAuthSessionsJob } from "../modules/auth/jobs/remove-auth-sessions.job";
import { syncExchangeRatesJob } from "../modules/finance/jobs/sync-exchange-rates.job";
import { checkLicenseStatusJob } from "../modules/license/jobs/check-license-status.job";
import { removeExpiredOneTimeTokensJob } from "../modules/auth/jobs/remove-expired-one-time-tokens.job";
import { logger } from "../shared/utils/core/logger";
import { jobScheduler } from "./scheduler";

export function registerJobs(): void {
  logger.log("[JobScheduler] Registering jobs...");
  jobScheduler.registerJob(removeAuthSessionsJob);
  jobScheduler.registerJob(checkLicenseStatusJob);
  jobScheduler.registerJob(removeExpiredOneTimeTokensJob);
  jobScheduler.registerJob(syncExchangeRatesJob);
  logger.log("[JobScheduler] Jobs registered successfully!");
}
