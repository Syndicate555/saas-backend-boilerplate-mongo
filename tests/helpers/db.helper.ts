/**
 * Database test helpers
 * Provides utilities for managing test database
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../../src/core/config/logger';

let mongod: MongoMemoryServer | undefined;

/**
 * Connect to the in-memory database
 */
export const connectTestDB = async (): Promise<void> => {
  try {
    // Create an in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri);

    logger.info('Connected to test database');
  } catch (error) {
    logger.error('Error connecting to test database', { error });
    throw error;
  }
};

/**
 * Close database connection and stop MongoDB instance
 */
export const closeTestDB = async (): Promise<void> => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (mongod) {
      await mongod.stop();
    }

    logger.info('Test database connection closed');
  } catch (error) {
    logger.error('Error closing test database', { error });
    throw error;
  }
};

/**
 * Clear all collections in the database
 */
export const clearTestDB = async (): Promise<void> => {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }

    logger.info('Test database cleared');
  } catch (error) {
    logger.error('Error clearing test database', { error });
    throw error;
  }
};

/**
 * Get a clean database connection for each test
 */
export const setupTestDB = () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });
};
