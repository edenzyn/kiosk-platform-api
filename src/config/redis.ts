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
  });

  client.on("connect", () => {
    logger.success("Redis connected successfully");
  });

  client.on("error", (err) => {
    logger.error("Redis connection error", err);
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
