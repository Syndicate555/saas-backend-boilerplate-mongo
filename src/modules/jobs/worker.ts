import { Worker } from 'bullmq';
import { getRedisClient } from '../../core/config/redis';
import { logger } from '../../core/config/logger';
import { features } from '../../core/config/env';
import { sendEmail } from '../email/service';

// Store worker instances for graceful shutdown
const workers: Worker[] = [];

// Placeholder function for processing uploads
async function processUpload(data: any) {
  // Implement your upload processing logic here
  logger.info('Processing upload job', { data });
}

export async function startWorkers() {
  // Only start workers if Redis is configured
  if (!features.redis) {
    logger.warn('Redis not configured, skipping worker initialization');
    return;
  }

  const redisClient = getRedisClient();
  if (!redisClient) {
    logger.error('Failed to get Redis client for workers');
    return;
  }

  // Wait for Redis to be ready
  if (redisClient.status !== 'ready') {
    logger.warn('Redis not ready yet, waiting for connection...');
    await new Promise((resolve) => {
      redisClient.once('ready', resolve);
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  if (redisClient.status !== 'ready') {
    logger.error('Redis failed to become ready, skipping workers');
    return;
  }

  try {
    // BullMQ needs connection options, not the ioredis client directly
    // Extract connection details from Redis client
    const connectionOptions = {
      host: redisClient.options.host || 'localhost',
      port: redisClient.options.port || 6379,
      // Add other options if needed (password, db, etc.)
    };

    // Worker to send emails
    const emailWorker = new Worker(
      'emails',
      async (job) => {
        await sendEmail(job.data);
      },
      { connection: connectionOptions }
    );
    workers.push(emailWorker);

    // Worker to process uploads
    const uploadWorker = new Worker(
      'uploads',
      async (job) => {
        await processUpload(job.data);
      },
      { connection: connectionOptions }
    );
    workers.push(uploadWorker);

    logger.info('Background job workers started successfully');
  } catch (error) {
    logger.error('Failed to start workers', { error });
  }
}

export async function stopWorkers() {
  if (workers.length === 0) {
    return;
  }

  logger.info('Stopping background job workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
  logger.info('All workers stopped');
}
