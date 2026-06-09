import { createClient, type RedisClientType } from "redis";
import { logger } from "../../lib/logger";

let client: RedisClientType | null = null;
const memory = new Map<string, { value: string; expiresAt: number }>();

export async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client?.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => logger.error({ err }, "Redis error"));
  await client.connect();
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (redis) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) as T : null;
  }
  const item = memory.get(key);
  if (!item || item.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(item.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, payload, { EX: ttlSeconds });
    return;
  }
  memory.set(key, { value: payload, expiresAt: Date.now() + ttlSeconds * 1000 });
}
