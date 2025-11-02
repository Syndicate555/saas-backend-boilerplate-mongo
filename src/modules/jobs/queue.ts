import { Queue } from 'bullmq';
import { getRedisClient } from '../../core/config/redis';

// FIX: Use getRedisClient() function instead of direct redis import
// Cast to any to avoid TypeScript error when Redis client is null
const redisConnection = getRedisClient();

export const emailQueue = new Queue('emails', {
  connection: redisConnection as any,
});

export const uploadQueue = new Queue('uploads', {
  connection: redisConnection as any,
});
