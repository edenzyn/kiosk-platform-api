import Redis from "ioredis";
import { logger } from "../shared/utils/core/logger";
import { env } from "./env";

export interface RedisConnection {
  client: Redis;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function initRedis(): RedisConnection {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 1000, 15000);
    },
  });

  client.on("ready", () => {
    logger.success("Redis connected and ready");
  });

  client.on("close", () => {
    logger.warn("Redis connection closed");
  });

  client.on("reconnecting", (delay: number) => {
    logger.log(`Redis reconnecting in ${delay}ms...`);
  });

  client.on("error", (err) => {
    logger.error("Redis connection error", { err: err.message });
  });

  return {
    client,
    async ping() {
      await client.ping();
    },
    async close() {
      await client.quit();
    },
  };
}
