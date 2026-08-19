import { createServer } from "node:http";
import { App } from "./app";
import { container } from "./config/container";
import type { Database } from "./config/db";
import { env } from "./config/env";
import type { RedisConnection } from "./config/redis";
import { registerJobs } from "./jobs/register-jobs";
import { jobScheduler } from "./jobs/scheduler";
import { logger } from "./shared/utils/core/logger";

function bootstrap(): void {
  const app = new App();
  const server = createServer(app.instance);

  const redis = container.resolve<RedisConnection>("redis");

  registerJobs();

  server.listen(env.PORT, () => {
    logger.log(`Server running on port ${env.PORT}`);
    jobScheduler.start();
  });

  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.log(`Received ${signal}; shutting down`);

    const forceShutdownTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceShutdownTimer.unref();

    server.close(async (serverError) => {
      try {
        jobScheduler.stop();
        const database = container.resolve<Database>("database");
        await database.close();
        await redis.close();
        if (serverError) throw serverError;
        clearTimeout(forceShutdownTimer);
        logger.log("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Shutdown failed", { err: error });
        process.exit(1);
      }
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

bootstrap();
