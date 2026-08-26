import { container } from "../../../config/container";
import { env } from "../../../config/env";
import type { ScheduledJob } from "../../../jobs/scheduler";
import { logger } from "../../../shared/utils/core/logger";
import type { FinanceService } from "../finance.service";

const RETRY_DELAYS_MINUTES = [15, 30, 60, 120];

export async function syncExchangeRatesTask(financeService?: FinanceService) {
  const service =
    financeService ?? container.resolve<FinanceService>("financeService");
  return service.refreshRates();
}

async function runWithRetries(attempt: number): Promise<void> {
  const result = await syncExchangeRatesTask();

  if (result) {
    logger.log(
      `[Job:SyncExchangeRates] Refreshed exchange rates (rateDate=${result.rateDate}).`,
    );
    return;
  }

  if (attempt >= RETRY_DELAYS_MINUTES.length) {
    logger.warn(
      "[Job:SyncExchangeRates] Provider has not published a newer rate after all retries; keeping the latest cached rate.",
    );
    return;
  }

  const delayMinutes = RETRY_DELAYS_MINUTES[attempt] as number;
  logger.log(
    `[Job:SyncExchangeRates] New rate not published yet; retrying in ${delayMinutes}m (attempt ${
      attempt + 1
    }/${RETRY_DELAYS_MINUTES.length}).`,
  );

  setTimeout(
    () => {
      runWithRetries(attempt + 1).catch((error) => {
        logger.error("[Job:SyncExchangeRates] Retry attempt failed", {
          err: error,
        });
      });
    },
    delayMinutes * 60 * 1000,
  ).unref();
}

export const syncExchangeRatesJob: ScheduledJob = {
  name: "SyncExchangeRates",
  cronExpression: env.FINANCE_EXCHANGE_RATE_SYNC_CRON,
  timezone: env.FINANCE_EXCHANGE_RATE_SYNC_TIMEZONE,
  enabled: true,
  runOnStartup: false,
  handler: async () => {
    logger.log("[Job:SyncExchangeRates] Starting exchange rate sync...");
    try {
      await runWithRetries(0);
    } catch (error) {
      logger.error("[Job:SyncExchangeRates] Failed", { err: error });
    }
  },
};

if (require.main === module) {
  (async () => {
    try {
      logger.log("[Script] Running sync-exchange-rates task manually...");
      const result = await syncExchangeRatesTask();
      logger.log(`[Script] Completed. Result: ${JSON.stringify(result)}`);
      process.exit(0);
    } catch (error) {
      logger.error("[Script] Error syncing exchange rates:", { err: error });
      process.exit(1);
    }
  })();
}
