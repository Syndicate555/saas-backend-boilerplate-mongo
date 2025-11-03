/**
 * Database Seed Script
 * Creates sample data for testing and development
 * MongoDB only
 */

import { env } from '../src/core/config/env';
import { logger } from '../src/core/config/logger';
import { database } from '../src/core/config/database';

// MongoDB imports
import { Example } from '../src/features/example/example.model';
import { AuditLog } from '../src/database/mongodb/models/AuditLog';
import mongoose from 'mongoose';

/**
 * Sample data definitions
 */
const sampleExamples = [
  {
    name: 'Getting Started with the API',
    description:
      'A comprehensive guide to getting started with our API and basic integration patterns.',
    status: 'published' as const,
    tags: ['api', 'tutorial', 'beginner'],
    isPublic: true,
    metadata: {
      difficulty: 'beginner',
      category: 'api',
      readTime: '5 minutes',
    },
  },
  {
    name: 'Advanced Authentication Strategies',
    description:
      'Explore advanced authentication methods including OAuth2, JWT, and custom implementations.',
    status: 'published' as const,
    tags: ['authentication', 'security', 'advanced'],
    isPublic: true,
    metadata: {
      difficulty: 'advanced',
      category: 'security',
      readTime: '15 minutes',
    },
  },
  {
    name: 'Database Optimization Techniques',
    description:
      'Learn how to optimize database queries and improve application performance.',
    status: 'draft' as const,
    tags: ['database', 'performance', 'optimization'],
    isPublic: false,
    metadata: {
      difficulty: 'intermediate',
      category: 'database',
      readTime: '12 minutes',
    },
  },
  {
    name: 'Real-time Data Synchronization',
    description:
      'Implement real-time data synchronization across multiple clients using WebSockets.',
    status: 'archived' as const,
    tags: ['realtime', 'websockets', 'advanced'],
    isPublic: false,
    metadata: {
      difficulty: 'advanced',
      category: 'realtime',
      readTime: '18 minutes',
      deprecated: true,
    },
  },
  {
    name: 'Microservices Architecture Guide',
    description:
      'Design and implement a scalable microservices architecture for your applications.',
    status: 'published' as const,
    tags: ['architecture', 'microservices', 'scalability'],
    isPublic: true,
    metadata: {
      difficulty: 'advanced',
      category: 'architecture',
      readTime: '20 minutes',
    },
  },
];

const sampleAuditLogs = [
  {
    action: 'CREATE',
    resource: 'example',
    userEmail: 'admin@example.com',
    metadata: { reason: 'Initial seed data' },
    statusCode: 201,
  },
  {
    action: 'UPDATE',
    resource: 'example',
    userEmail: 'admin@example.com',
    metadata: { fields: ['status', 'isPublic'] },
    statusCode: 200,
  },
  {
    action: 'DELETE',
    resource: 'example',
    userEmail: 'admin@example.com',
    metadata: { reason: 'Testing purposes' },
    statusCode: 204,
  },
  {
    action: 'READ',
    resource: 'example',
    userEmail: 'user@example.com',
    metadata: { count: 5 },
    statusCode: 200,
  },
  {
    action: 'LOGIN',
    resource: 'user',
    userEmail: 'admin@example.com',
    metadata: { provider: 'email' },
    statusCode: 200,
  },
];

/**
 * Seed MongoDB database
 */
async function seedMongoDB(): Promise<void> {
  try {
    logger.info('Starting MongoDB seed...');

    // Create a test user first (required by example model)
    let testUserId: mongoose.Types.ObjectId;

    // Check if User model exists and create a test user
    try {
      const { User } = await import('../src/database/mongodb/models/User');
      let testUser = await User.findOne({ email: 'seed@example.com' });

      if (!testUser) {
        logger.info('Creating test user for seed data...');
        testUser = await User.create({
          email: 'seed@example.com',
          name: 'Seed User',
          clerkId: 'seed_user_123',
        });
        logger.info('Test user created', { userId: testUser._id });
      }

      testUserId = testUser._id as mongoose.Types.ObjectId;
    } catch (error) {
      // If User model doesn't exist, create a dummy ObjectId
      logger.warn('Could not access User model, using placeholder ID');
      testUserId = new mongoose.Types.ObjectId() as mongoose.Types.ObjectId;
    }

    // Clear existing example data (for clean seed)
    logger.info('Clearing existing example data...');
    await Example.deleteMany({});
    logger.info('Existing example data cleared');

    // Create sample examples
    logger.info('Creating sample examples...');
    const createdExamples = await Promise.all(
      sampleExamples.map((example) =>
        Example.create({
          ...example,
          userId: testUserId,
          viewCount: Math.floor(Math.random() * 100),
        })
      )
    );

    logger.info('Sample examples created', {
      count: createdExamples.length,
      ids: createdExamples.map((e) => e._id),
    });

    // Create sample audit logs
    logger.info('Creating sample audit logs...');
    const createdAuditLogs = await Promise.all(
      sampleAuditLogs.map((log) =>
        AuditLog.log({
          ...log,
          resourceId: createdExamples[0]?._id?.toString(),
          duration: Math.floor(Math.random() * 1000),
        })
      )
    );

    logger.info('Sample audit logs created', {
      count: createdAuditLogs.length,
    });

    // Log some statistics
    const exampleCount = await Example.countDocuments();
    const auditLogCount = await AuditLog.countDocuments();

    logger.info('MongoDB seed completed successfully', {
      examples: exampleCount,
      auditLogs: auditLogCount,
    });
  } catch (error) {
    logger.error('Error seeding MongoDB', { error });
    throw error;
  }
}


/**
 * Main seed function
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Database Seeding Started', {
      database: env.DATABASE_TYPE,
      nodeEnv: env.NODE_ENV,
    });

    // Connect to database
    await database.connect();

    // Seed MongoDB database
    await seedMongoDB();

    const duration = Date.now() - startTime;
    logger.info('Database Seeding Completed Successfully', {
      duration: `${duration}ms`,
      database: env.DATABASE_TYPE,
    });

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database Seeding Failed', {
      error,
      duration: `${duration}ms`,
      database: env.DATABASE_TYPE,
    });

    process.exit(1);
  } finally {
    // Ensure graceful disconnection
    try {
      await database.disconnect();
    } catch (disconnectError) {
      logger.error('Error during disconnect', { disconnectError });
    }
  }
}

// Run the seed script
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in seed script', { error });
    process.exit(1);
  });
}

export { seedMongoDB };
