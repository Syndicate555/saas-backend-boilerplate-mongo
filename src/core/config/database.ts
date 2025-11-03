import mongoose from 'mongoose';
import { logger } from './logger';
import { connectMongoDB, disconnectMongoDB } from '../../database/mongodb/connection';

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): typeof mongoose;
}

class Database implements DatabaseConnection {
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Database connection already established');
      return;
    }

    try {
      logger.info('Connecting to MongoDB database...');
      await connectMongoDB();
      this.connected = true;
      logger.info('Successfully connected to MongoDB database');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      logger.warn('No database connection to close');
      return;
    }

    try {
      logger.info('Disconnecting from database...');
      await disconnectMongoDB();
      this.connected = false;
      logger.info('Successfully disconnected from database');
    } catch (error) {
      logger.error('Error disconnecting from database', { error });
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): typeof mongoose {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    // Return mongoose for MongoDB operations
    return mongoose;
  }
}

export const database = new Database();

// Graceful shutdown handler
export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} signal. Starting graceful shutdown...`);

  try {
    await database.disconnect();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
