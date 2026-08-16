import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { AuthRepository } from "../auth.repository";

export async function clearExpiredRefreshTokensTask(
  authRepository?: AuthRepository,
): Promise<number> {
  const repository =
    authRepository ?? container.resolve<AuthRepository>("authRepository");

  const deletedCount = await repository.deleteExpiredRefreshTokens();
  return deletedCount;
}

export const clearExpiredRefreshTokensJob: ScheduledJob = {
  name: "ClearExpiredRefreshTokens",
  cronExpression: env.REFRESH_TOKEN_CLEANUP_CRON,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log(
      "[Job:ClearExpiredRefreshTokens] Starting cleanup of expired refresh tokens...",
    );
    try {
      const count = await clearExpiredRefreshTokensTask();
      logger.log(
        `[Job:ClearExpiredRefreshTokens] Completed. Removed ${count} expired refresh token(s).`,
      );
    } catch (error) {
      logger.error(
        "[Job:ClearExpiredRefreshTokens] Failed to clear expired refresh tokens",
        { err: error },
      );
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log(
        "[Script] Running clear-expired-refresh-tokens task manually...",
      );
      const count = await clearExpiredRefreshTokensTask();
      logger.log(
        `[Script] Successfully removed ${count} expired refresh token(s).`,
      );
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error clearing expired refresh tokens:", {
        err: error,
      });
      process.exit(1);
    }
  })();
}
