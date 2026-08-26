import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../shared/utils/core/logger";

export interface ScheduledJob {
  name: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  runOnStartup?: boolean;
  handler: () => Promise<void>;
}

export class JobScheduler {
  private _jobs: ScheduledJob[] = [];
  private _runningTasks: Map<string, ScheduledTask> = new Map();
  private _isStarted = false;

  public registerJob(job: ScheduledJob): void {
    this._jobs.push(job);
    if (this._isStarted && job.enabled !== false) {
      this._scheduleJob(job);
    }
  }

  public start(): void {
    if (this._isStarted) {
      logger.log("[JobScheduler] Scheduler is already started.");
      return;
    }

    this._isStarted = true;
    logger.log(
      `[JobScheduler] Starting scheduler with ${this._jobs.length} registered job(s)...`,
    );

    for (const job of this._jobs) {
      if (job.enabled !== false) {
        this._scheduleJob(job);
      }
    }
  }

  private _scheduleJob(job: ScheduledJob): void {
    if (!cron.validate(job.cronExpression)) {
      logger.error(
        `[JobScheduler] Invalid cron expression '${job.cronExpression}' for job '${job.name}'. Job not scheduled.`,
      );
      return;
    }

    if (this._runningTasks.has(job.name)) {
      logger.log(
        `[JobScheduler] Job '${job.name}' is already active. Skipping duplicate schedule.`,
      );
      return;
    }

    if (job.runOnStartup) {
      logger.log(`[JobScheduler] Executing '${job.name}' on startup...`);
      job.handler().catch((error) => {
        logger.error(
          `[JobScheduler] Execution failed for job '${job.name}' (startup)`,
          { err: error },
        );
      });
    }

    const scheduledTask = cron.schedule(
      job.cronExpression,
      async () => {
        try {
          await job.handler();
        } catch (error) {
          logger.error(
            `[JobScheduler] Execution failed for job '${job.name}'`,
            { err: error },
          );
        }
      },
      {
        name: job.name,
        timezone: job.timezone,
      },
    );

    this._runningTasks.set(job.name, scheduledTask);
    logger.log(
      `[JobScheduler] Scheduled '${job.name}' [${job.cronExpression}]`,
    );
  }

  public stop(): void {
    if (!this._isStarted) return;

    logger.log("[JobScheduler] Stopping all scheduled cron tasks...");
    for (const [name, task] of this._runningTasks.entries()) {
      task.stop();
      logger.log(`[JobScheduler] Stopped job '${name}'`);
    }
    this._runningTasks.clear();
    this._isStarted = false;
    logger.log("[JobScheduler] All cron jobs stopped.");
  }
}

export const jobScheduler = new JobScheduler();
