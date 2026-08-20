import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { AuthRepository } from "../auth.repository";

export async function removeAuthSessionsTask(
  authRepository?: AuthRepository,
): Promise<number> {
  const repository =
    authRepository ?? container.resolve<AuthRepository>("authRepository");

  const removedCount = await repository.removeAuthSessions();
  return removedCount;
}

export const removeAuthSessionsJob: ScheduledJob = {
  name: "RemoveAuthSessions",
  cronExpression: env.AUTH_SESSION_CLEANUP_CRON,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log(
      "[Job:RemoveAuthSessions] Starting cleanup of expired auth sessions...",
    );
    try {
      const count = await removeAuthSessionsTask();
      logger.log(
        `[Job:RemoveAuthSessions] Completed. Removed ${count} auth session(s).`,
      );
    } catch (error) {
      logger.error(
        "[Job:RemoveAuthSessions] Failed to remove auth sessions",
        { err: error },
      );
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log("[Script] Running remove-auth-sessions task manually...");
      const count = await removeAuthSessionsTask();
      logger.log(`[Script] Successfully removed ${count} auth session(s).`);
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error removing auth sessions:", {
        err: error,
      });
      process.exit(1);
    }
  })();
}
