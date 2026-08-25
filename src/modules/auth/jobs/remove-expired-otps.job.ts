import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { AuthRepository } from "../auth.repository";

export async function removeExpiredOtpsTask(
  authRepository?: AuthRepository,
): Promise<number> {
  const repository =
    authRepository ?? container.resolve<AuthRepository>("authRepository");

  return repository.deleteOtps({ expiredBefore: new Date() });
}

export const removeExpiredOtpsJob: ScheduledJob = {
  name: "RemoveExpiredOtps",
  cronExpression: env.OTP_CLEANUP_CRON,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log("[Job:RemoveExpiredOtps] Starting cleanup of expired OTPs...");
    try {
      const count = await removeExpiredOtpsTask();
      logger.log(
        `[Job:RemoveExpiredOtps] Completed. Removed ${count} OTP(s).`,
      );
    } catch (error) {
      logger.error("[Job:RemoveExpiredOtps] Failed to remove expired OTPs", {
        err: error,
      });
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log("[Script] Running remove-expired-otps task manually...");
      const count = await removeExpiredOtpsTask();
      logger.log(`[Script] Successfully removed ${count} OTP(s).`);
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error removing expired OTPs:", { err: error });
      process.exit(1);
    }
  })();
}
