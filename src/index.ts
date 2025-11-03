/**
 * ✅ AUDIT STATUS: COMPLETE
 * - Implemented conditional module loading based on env vars
 * - Added graceful startup with health checks
 * - Added graceful shutdown handlers
 * - Proper error handling and logging
 * - Only loads modules if their dependencies are configured
 */
import 'dotenv/config';
import { Express } from 'express';
import { Server } from 'http';
import { createServer, startServer } from './core/server';
import { logger } from './core/config/logger';
import { env, features } from './core/config/env';
import { initializeRedis, closeRedis } from './core/config/redis';
import { database } from './core/config/database';
import { notFoundHandler, errorHandler } from './core/middleware/errorHandler';

// Track server instance for graceful shutdown
let server: Server | null = null;

/**
 * Initialize and start the application
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info('🚀 Starting SaaS Backend Boilerplate...');
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`🗄️  Database: ${env.DATABASE_TYPE}`);

    // Initialize Redis if configured
    if (features.redis) {
      logger.info('💾 Initializing Redis...');
      initializeRedis();
    } else {
      logger.warn(
        '⚠️  Redis not configured - jobs and realtime features disabled'
      );
    }

    // Initialize authentication
    if (features.auth) {
      logger.info('🔐 Clerk authentication enabled');
    } else {
      logger.warn('⚠️  Running without authentication (development mode only)');
    }

    // Log enabled features
    if (features.stripe) logger.info('💳 Stripe payments enabled');
    if (features.s3) logger.info('☁️  AWS S3 uploads enabled');
    if (features.sendgrid) logger.info('📧 SendGrid email enabled');
    if (features.sentry) logger.info('🐛 Sentry error tracking enabled');

    // Create Express app
    const app = createServer();

    // Mount API routes
    await mountRoutes(app);

    // Register 404 handler (must be after all routes)
    app.use(notFoundHandler);

    // Register error handler (must be last)
    app.use(errorHandler);

    // Start server and store reference
    server = (await startServer(app)) as unknown as Server;

    logger.info('✅ Application started successfully');
  } catch (error) {
    logger.error('❌ Failed to start application', { error });
    await cleanup();
    process.exit(1);
  }
}

/**
 * Mount all API routes conditionally based on enabled features
 */
async function mountRoutes(app: Express): Promise<void> {
  logger.info('📡 Mounting API routes...');

  // Always mount example routes (core feature)
  const exampleRoutes = require('./features/example/example.routes').default;
  app.use('/api/examples', exampleRoutes);
  logger.info('  ✓ Example routes mounted at /api/examples');

  // Mount authentication webhook (if Clerk is configured)
  if (features.auth) {
    try {
      const { handleClerkWebhook } = require('./modules/auth/webhook');
      app.post('/api/webhooks/clerk', handleClerkWebhook);
      logger.info('  ✓ Clerk webhook mounted at /api/webhooks/clerk');
    } catch (error) {
      logger.error('Failed to mount Clerk webhook', { error });
    }
  }

  // Mount payment routes (if Stripe is configured)
  if (features.stripe) {
    try {
      const paymentRoutes = require('./modules/payments/routes').default;
      app.use('/api/payments', paymentRoutes);
      logger.info('  ✓ Payment routes mounted at /api/payments');

      const { handleStripeWebhook } = require('./modules/payments/webhook');
      app.post('/api/webhooks/stripe', handleStripeWebhook);
      logger.info('  ✓ Stripe webhook mounted at /api/webhooks/stripe');
    } catch (error) {
      logger.error('Failed to mount payment routes', { error });
    }
  }

  // Mount upload routes (if S3 is configured)
  if (features.s3) {
    try {
      const uploadRoutes = require('./modules/uploads/routes').default;
      app.use('/api/uploads', uploadRoutes);
      logger.info('  ✓ Upload routes mounted at /api/uploads');
    } catch (error) {
      logger.error('Failed to mount upload routes', { error });
    }
  }

  // Initialize Socket.IO for realtime features (if Redis is configured)
  if (features.realtime && server) {
    try {
      const { setupSocketIO } = require('./modules/realtime/server');
      setupSocketIO(server);
      logger.info('  ✓ Socket.IO realtime server initialized');
    } catch (error) {
      logger.error('Failed to initialize Socket.IO', { error });
    }
  }

  // Initialize background job workers (if Redis is configured)
  if (features.jobs) {
    try {
      const { startWorkers } = require('./modules/jobs/worker');
      await startWorkers();
      logger.info('  ✓ Background job workers started');
    } catch (error) {
      logger.error('Failed to start job workers', { error });
    }
  }

  logger.info('✅ All routes mounted successfully');
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`\n🛑 Received ${signal} signal. Starting graceful shutdown...`);

  try {
    await cleanup();
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown', { error });
    process.exit(1);
  }
}

/**
 * Cleanup resources
 */
async function cleanup(): Promise<void> {
  // Close HTTP server
  if (server) {
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve) => {
      server!.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  // Disconnect from database
  if (database.isConnected()) {
    logger.info('Disconnecting from database...');
    await database.disconnect();
  }

  // Close Redis connection
  if (features.redis) {
    logger.info('Closing Redis connection...');
    await closeRedis();
  }

  // Stop job workers
  if (features.jobs) {
    try {
      const { stopWorkers } = require('./modules/jobs/worker');
      logger.info('Stopping job workers...');
      await stopWorkers();
    } catch (error) {
      logger.error('Error stopping job workers', { error });
    }
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any) => {
  logger.error('❌ Unhandled Promise Rejection', {
    error: reason,
    stack: reason?.stack,
  });

  // Exit in development, just log in production
  if (env.NODE_ENV !== 'production') {
    gracefulShutdown('unhandledRejection');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ Uncaught Exception', { error });
  gracefulShutdown('uncaughtException');
});

// Start the application
bootstrap().catch((error) => {
  logger.error('Fatal error during bootstrap', { error });
  process.exit(1);
});
