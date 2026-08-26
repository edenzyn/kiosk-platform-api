import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { AuthRepository } from "../auth.repository";

export async function removeExpiredOneTimeTokensTask(
  authRepository?: AuthRepository,
): Promise<number> {
  const repository =
    authRepository ?? container.resolve<AuthRepository>("authRepository");

  return repository.deleteOneTimeTokens({ expiredBefore: new Date() });
}

export const removeExpiredOneTimeTokensJob: ScheduledJob = {
  name: "RemoveExpiredOneTimeTokens",
  cronExpression: env.ONE_TIME_TOKEN_CLEANUP_CRON,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log("[Job:RemoveExpiredOneTimeTokens] Starting cleanup of expired one-time tokens...");
    try {
      const count = await removeExpiredOneTimeTokensTask();
      logger.log(
        `[Job:RemoveExpiredOneTimeTokens] Completed. Removed ${count} token(s).`,
      );
    } catch (error) {
      logger.error("[Job:RemoveExpiredOneTimeTokens] Failed to remove expired one-time tokens", {
        err: error,
      });
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log("[Script] Running remove-expired-oneTimeTokens task manually...");
      const count = await removeExpiredOneTimeTokensTask();
      logger.log(`[Script] Successfully removed ${count} token(s).`);
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error removing expired one-time tokens:", error);
      process.exit(1);
    }
  })();
}
