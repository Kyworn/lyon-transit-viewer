import { createClient } from 'redis';
import { dbLogger } from '../utils/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        dbLogger.error('Redis max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

let isRedisReady = false;

redisClient.on('error', (err) => {
  isRedisReady = false;
  dbLogger.error('Redis Client Error', { error: err.message });
});
redisClient.on('connect', () => {
  dbLogger.info('Redis Client Connected');
});
redisClient.on('ready', () => {
  isRedisReady = true;
  dbLogger.info('Redis Client Ready');
});

// Connect to Redis (only if not already connected)
if (!redisClient.isOpen && !redisClient.isReady) {
  redisClient.connect().catch((error) => {
    dbLogger.error('Failed to connect to Redis', { error });
  });
}

// Default TTL: 15 minutes for static data
const DEFAULT_TTL = 15 * 60; // seconds

export class CacheService {
  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisReady) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      dbLogger.error(`Cache get error for key: ${key}`, { error });
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  static async set(key: string, value: any, ttl: number = DEFAULT_TTL): Promise<void> {
    if (!isRedisReady) return;
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      dbLogger.error(`Cache set error for key: ${key}`, { error });
    }
  }

  /**
   * Delete specific key
   */
  static async del(key: string): Promise<void> {
    if (!isRedisReady) return;
    try {
      await redisClient.del(key);
    } catch (error) {
      dbLogger.error(`Cache delete error for key: ${key}`, { error });
    }
  }

  /**
   * Delete keys by pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!isRedisReady) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      dbLogger.error(`Cache delete pattern error: ${pattern}`, { error });
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    if (!isRedisReady) return;
    try {
      await redisClient.flushAll();
      dbLogger.info('Cache cleared');
    } catch (error) {
      dbLogger.error('Cache clear error', { error });
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    if (!isRedisReady) return false;
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      dbLogger.error(`Cache exists error for key: ${key}`, { error });
      return false;
    }
  }

  /**
   * Get or set pattern: try cache first, if miss then call function and cache result
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and cache
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  dbLogger.info('SIGTERM signal received: closing Redis connection');
  await redisClient.quit();
});

export default CacheService;
