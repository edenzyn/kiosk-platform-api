import type { RedisConnection } from "../../../config/redis";

export class RedisProvider {
  constructor(private readonly redis: RedisConnection) {}

  async get(key: string): Promise<string | null> {
    return this.redis.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.redis.client.set(key, value);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redis.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.redis.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.client.exists(key)) > 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.client.expire(key, ttlSeconds);
  }

  async incr(key: string): Promise<number> {
    return this.redis.client.incr(key);
  }
}
