import { Worker } from 'bullmq';
import { getRedisClient } from '../../core/config/redis';
import { logger } from '../../core/config/logger';
import { sendEmail } from '../email/service';

// Placeholder function for processing uploads
async function processUpload(data: any) {
  // Implement your upload processing logic here
  logger.info('Processing upload job', { data });
}

export function startWorkers() {
  // FIX: Use getRedisClient() function instead of direct redis import
  // Cast to any to avoid TypeScript error when Redis client is null
  const redisConnection = getRedisClient();

  // Worker to send emails
  new Worker(
    'emails',
    async (job) => {
      await sendEmail(job.data);
    },
    { connection: redisConnection as any },
  );

  // Worker to process uploads
  new Worker(
    'uploads',
    async (job) => {
      await processUpload(job.data);
    },
    { connection: redisConnection as any },
  );
  logger.info('Workers started');
}
