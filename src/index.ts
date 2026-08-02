import { createServer } from "node:http";
import { App } from "./app";
import { container } from "./config/container";
import type { Database } from "./config/db";
import { env } from "./config/env";
import { logger } from "./shared/utils/logger";

function bootstrap(): void {
  const app = new App();
  const server = createServer(app.instance);

  server.listen(env.PORT, () => {
    logger.log(`Server running on port ${env.PORT}`);
  });

  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    console.log("check test");
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
        const database = container.resolve<Database>("database");
        await database.close();
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
