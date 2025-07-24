import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<RedisClientType> => {
  try {
    if (!redisClient) {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        },
      });

      redisClient.on('error', (error) => {
        logger.error('Redis error:', error);
      });

      redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });

      redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

      redisClient.on('end', () => {
        logger.info('Redis client disconnected');
      });

      await redisClient.connect();
    }

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
};

export { redisClient };