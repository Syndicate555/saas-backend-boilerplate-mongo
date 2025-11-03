import Redis from 'ioredis';
import { env, features } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initializeRedis(): Redis | null {
  if (!features.redis) {
    logger.info('Redis is not configured, skipping initialization');
    return null;
  }

  if (redis) {
    logger.warn('Redis client already initialized');
    return redis;
  }

  try {
    redis = new Redis(env.REDIS_URL!, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(
          `Redis connection attempt ${times}, retrying in ${delay}ms...`
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      logger.info('Redis client connected');
    });

    redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    redis.on('error', (error: Error) => {
      logger.error('Redis client error', { error });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  if (!features.redis) {
    return null;
  }

  if (!redis) {
    redis = initializeRedis();
  }

  return redis;
}

/**
 * Helper function to get a value from Redis
 */
export async function get<T = string>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    logger.error('Redis get error', { error, key });
    return null;
  }
}

/**
 * Helper function to set a value in Redis
 */
export async function set(
  key: string,
  value: any,
  ttl?: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    logger.error('Redis set error', { error, key });
    return false;
  }
}

/**
 * Helper function to delete a key from Redis
 */
export async function del(key: string | string[]): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const keys = Array.isArray(key) ? key : [key];
    await client.del(...keys);
    return true;
  } catch (error) {
    logger.error('Redis delete error', { error, key });
    return false;
  }
}

/**
 * Helper function to check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis exists error', { error, key });
    return false;
  }
}

/**
 * Helper function to increment a counter
 */
export async function incr(key: string): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.incr(key);
  } catch (error) {
    logger.error('Redis incr error', { error, key });
    return null;
  }
}

/**
 * Helper function to set expiration on a key
 */
export async function expire(key: string, ttl: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.expire(key, ttl);
    return result === 1;
  } catch (error) {
    logger.error('Redis expire error', { error, key, ttl });
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

// Export the Redis type for use in other modules
export type RedisClient = Redis;
