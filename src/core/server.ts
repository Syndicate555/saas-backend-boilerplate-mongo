import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { env, features } from './config/env';
import { logger } from './config/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { responseHelpers } from './utils/apiResponse';
import { attachPagination } from './utils/pagination';
import { HealthStatus } from './types';
import { database } from './config/database';
import { getRedisClient } from './config/redis';

/**
 * Create and configure Express application
 */
export function createServer(): Express {
  const app = express();

  // Initialize Sentry if configured
  if (features.sentry && env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
      ],
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });

    // Sentry request handler
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // Trust proxy (for Heroku, Railway, Render, etc.)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        const allowedOrigins = env.FRONTEND_URL.split(',').map((url) =>
          url.trim()
        );
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow localhost in development
        if (env.NODE_ENV === 'development' && origin.includes('localhost')) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: [
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
      ],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Raw body for webhook verification
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));

  // Compression
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Response helpers
  app.use(responseHelpers);

  // Pagination helper
  app.use(attachPagination);

  // Rate limiting on API routes
  app.use('/api', apiLimiter);

  // Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const version = process.env['npm_package_version'];
      const health: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: database.isConnected(),
          // Only include services in health check if they're enabled
          ...(features.redis && { redis: !!getRedisClient() }),
          ...(features.s3 && { s3: true }),
          ...(features.stripe && { stripe: true }),
          ...(features.sendgrid && { sendgrid: true }),
        },
        ...(version && { version }),
        uptime: process.uptime(),
      };

      // Check if any REQUIRED service is down (database is always required)
      // Optional services are only checked if they're enabled (included in the services object)
      const servicesDown = Object.entries(health.services).some(
        ([_key, value]) => value === false
      );

      if (servicesDown) {
        health.status = 'degraded';
      }

      res.status(health.status === 'ok' ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  // Metrics endpoint (for monitoring)
  app.get('/metrics', (_req: Request, res: Response) => {
    // You can integrate with Prometheus or other metrics systems here
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // API info endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      name: 'SaaS Backend Boilerplate',
      version: process.env['npm_package_version'] || '1.0.0',
      environment: env.NODE_ENV,
      documentation: '/api-docs',
    });
  });

  // OpenAPI documentation (if enabled)
  if (env.NODE_ENV !== 'production') {
    // We'll add Swagger UI here later
    app.get('/api-docs', (_req: Request, res: Response) => {
      res.json({
        message: 'API documentation will be available here',
        openapi: '3.0.0',
      });
    });
  }

  // Mount API routes (to be added by modules)
  // Routes will be mounted in index.ts via mountRoutes()
  // app.use('/api/auth', authRoutes);
  // app.use('/api/users', userRoutes);
  // app.use('/api/payments', paymentRoutes);
  // etc.

  // Error logging middleware (before error handler)
  app.use(errorLogger);

  // Sentry error handler (must be before any other error middleware)
  if (features.sentry && env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // NOTE: 404 and error handlers are now registered in index.ts AFTER all routes are mounted
  // This ensures that all feature routes are registered before the 404 handler catches them

  return app;
}

/**
 * Start the server
 */
export async function startServer(app: Express, port?: number): Promise<void> {
  const serverPort = port || env.PORT;

  try {
    // Connect to database
    await database.connect();

    // Start server
    const server = app.listen(serverPort, () => {
      logger.info(`🚀 Server running on port ${serverPort}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🗄️  Database: ${env.DATABASE_TYPE}`);

      if (features.redis) logger.info('💾 Redis: Enabled');
      if (features.s3) logger.info('☁️  S3: Enabled');
      if (features.stripe) logger.info('💳 Stripe: Enabled');
      if (features.sendgrid) logger.info('📧 SendGrid: Enabled');
      if (features.sentry) logger.info('🐛 Sentry: Enabled');
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${serverPort} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          logger.error(`Port ${serverPort} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}
