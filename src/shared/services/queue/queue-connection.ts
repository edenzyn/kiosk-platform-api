import Redis, { type RedisOptions } from "ioredis";
import { env } from "../../../config/env";
import { logger } from "../../utils/core/logger";

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
