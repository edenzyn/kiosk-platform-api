import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { LicenseService } from "../license.service";

export async function checkLicenseStatusTask(
  licenseService?: LicenseService,
): Promise<{ checkedCount: number; updatedCount: number }> {
  const service =
    licenseService ?? container.resolve<LicenseService>("licenseService");

  const result = await service.checkLicenseStatus();
  return result;
}

export const checkLicenseStatusJob: ScheduledJob = {
  name: "CheckLicenseStatus",
  cronExpression: env.LICENSE_STATUS_CHECK_CRON,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log(
      "[Job:CheckLicenseStatus] Starting license status verification...",
    );
    try {
      const { checkedCount, updatedCount } = await checkLicenseStatusTask();
      logger.log(
        `[Job:CheckLicenseStatus] Completed. Checked ${checkedCount} license(s), updated ${updatedCount} status(es).`,
      );
    } catch (error) {
      logger.error(
        "[Job:CheckLicenseStatus] Failed to verify license statuses",
        { err: error },
      );
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log("[Script] Running check-license-status task manually...");
      const { checkedCount, updatedCount } = await checkLicenseStatusTask();
      logger.log(
        `[Script] Completed. Checked ${checkedCount} license(s), updated ${updatedCount} status(es).`,
      );
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error verifying license statuses:", {
        err: error,
      });
      process.exit(1);
    }
  })();
}
