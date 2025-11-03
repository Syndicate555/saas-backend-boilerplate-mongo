import { Queue } from 'bullmq';
import { getRedisClient } from '../../core/config/redis';
import { features } from '../../core/config/env';
import { logger } from '../../core/config/logger';

let emailQueueInstance: Queue | null = null;
let uploadQueueInstance: Queue | null = null;

/**
 * Get email queue instance (lazy initialization)
 */
export function getEmailQueue(): Queue | null {
  if (!features.redis) {
    logger.warn('Redis not configured, email queue not available');
    return null;
  }

  if (!emailQueueInstance) {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.status === 'ready') {
      // BullMQ needs connection options, not the ioredis client directly
      const connectionOptions = {
        host: redisClient.options.host || 'localhost',
        port: redisClient.options.port || 6379,
      };
      emailQueueInstance = new Queue('emails', {
        connection: connectionOptions,
      });
    } else {
      logger.warn('Redis not ready, email queue not available');
      return null;
    }
  }

  return emailQueueInstance;
}

/**
 * Get upload queue instance (lazy initialization)
 */
export function getUploadQueue(): Queue | null {
  if (!features.redis) {
    logger.warn('Redis not configured, upload queue not available');
    return null;
  }

  if (!uploadQueueInstance) {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.status === 'ready') {
      // BullMQ needs connection options, not the ioredis client directly
      const connectionOptions = {
        host: redisClient.options.host || 'localhost',
        port: redisClient.options.port || 6379,
      };
      uploadQueueInstance = new Queue('uploads', {
        connection: connectionOptions,
      });
    } else {
      logger.warn('Redis not ready, upload queue not available');
      return null;
    }
  }

  return uploadQueueInstance;
}

// For backwards compatibility - export getter functions as properties
export const emailQueue = {
  get instance() {
    return getEmailQueue();
  }
};

export const uploadQueue = {
  get instance() {
    return getUploadQueue();
  }
};
