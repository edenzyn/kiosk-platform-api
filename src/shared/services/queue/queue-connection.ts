import Redis, { type RedisOptions } from "ioredis";
import { env } from "../../../config/env";
import { logger } from "../../utils/core/logger";

// BullMQ needs its own Redis connection, separate from the app's general
// `redisService` client — it requires `maxRetriesPerRequest: null` so its
// internal blocking commands (BRPOPLPUSH etc.) never get cut off by a retry
// cap, which would otherwise surface as random job-processing failures.
const queueRedisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export function createQueueConnection(): Redis {
  const client = new Redis(env.REDIS_URL, queueRedisOptions);

  client.on("error", (err) => {
    logger.error("Queue Redis connection error", { err: err.message });
  });

  return client;
}
