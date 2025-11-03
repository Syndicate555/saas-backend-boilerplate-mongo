// TypeScript Audit Status: FIXED - All type errors resolved
import mongoose, { Connection } from 'mongoose';
import { env } from '../../core/config/env';
import { logger } from '../../core/config/logger';

let connection: Connection | null = null;

/**
 * MongoDB connection options
 */
const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4, // Use IPv4
};

/**
 * Connect to MongoDB with retry logic
 */
export async function connectMongoDB(
  retries: number = 5,
  retryDelay: number = 1000
): Promise<Connection> {
  if (connection && connection.readyState === 1) {
    logger.warn('MongoDB connection already established');
    return connection;
  }

  if (env.DATABASE_TYPE !== 'mongodb' || !env.MONGO_URI) {
    throw new Error('MongoDB is not configured');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${retries})...`);

      await mongoose.connect(env.MONGO_URI, connectionOptions);
      connection = mongoose.connection;

      // Set up event listeners
      connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      // Create indexes
      await createIndexes();

      logger.info('Successfully connected to MongoDB');
      return connection;
    } catch (error) {
      lastError = error as Error;
      logger.error(`MongoDB connection attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to connect to MongoDB');
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongoDB(): Promise<void> {
  if (!connection) {
    logger.warn('No MongoDB connection to close');
    return;
  }

  try {
    await mongoose.disconnect();
    connection = null;
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

/**
 * Get MongoDB connection
 */
export function getMongoConnection(): Connection | null {
  return connection;
}

/**
 * Check if connected to MongoDB
 */
export function isMongoConnected(): boolean {
  return connection?.readyState === 1;
}

/**
 * Create database indexes
 */
async function createIndexes(): Promise<void> {
  try {
    logger.info('Creating MongoDB indexes...');

    // Import models to ensure schemas are registered
    const { User } = await import('./models/User');
    const { AuditLog } = await import('./models/AuditLog');

    // Create indexes for User model
    await User.createIndexes();

    // Create indexes for AuditLog model
    await AuditLog.createIndexes();

    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.error('Error creating MongoDB indexes:', error);
    // Don't throw - indexes can be created later
  }
}

/**
 * MongoDB health check
 */
export async function checkMongoHealth(): Promise<boolean> {
  if (!connection || connection.readyState !== 1) {
    return false;
  }

  try {
    // Add null check for connection.db
    if (!connection.db) {
      return false;
    }
    await connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getMongoStats(): Promise<any> {
  if (!connection || connection.readyState !== 1) {
    throw new Error('MongoDB not connected');
  }

  // Add null check for connection.db
  if (!connection.db) {
    throw new Error('MongoDB database not available');
  }

  const stats = await connection.db.stats();
  return {
    collections: stats['collections'],
    documents: stats['objects'],
    dataSize: stats['dataSize'],
    storageSize: stats['storageSize'],
    indexes: stats['indexes'],
    indexSize: stats['indexSize'],
  };
}

/**
 * Transaction helper
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  if (!connection) {
    throw new Error('MongoDB not connected');
  }

  const session = await connection.startSession();

  try {
    let result: T;

    await session.withTransaction(async () => {
      result = await fn(session);
    });

    return result!;
  } finally {
    await session.endSession();
  }
}
