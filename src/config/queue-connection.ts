import Redis, { type RedisOptions } from "ioredis";
import { logger } from "../shared/utils/core/logger";
import { env } from "./env";

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
