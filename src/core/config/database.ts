import { env } from './env';
import { logger } from './logger';
import { connectMongoDB, disconnectMongoDB } from '../../database/mongodb/connection';
import { getSupabaseClient, testSupabaseConnection } from '../../database/supabase/client';

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): any;
}

class Database implements DatabaseConnection {
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn('Database connection already established');
      return;
    }

    try {
      logger.info(`Connecting to ${env.DATABASE_TYPE} database...`);

      if (env.DATABASE_TYPE === 'mongodb') {
        await connectMongoDB();
      } else if (env.DATABASE_TYPE === 'supabase') {
        await testSupabaseConnection();
      }

      this.connected = true;
      logger.info(`Successfully connected to ${env.DATABASE_TYPE} database`);
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

      if (env.DATABASE_TYPE === 'mongodb') {
        await disconnectMongoDB();
      }
      // Supabase client doesn't need explicit disconnection

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

  getClient(): any {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    if (env.DATABASE_TYPE === 'supabase') {
      return getSupabaseClient();
    }

    // MongoDB returns mongoose connection through the connection module
    return null;
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
