/**
 * Test app helper for integration tests
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import exampleRoutes from '../../src/features/example/example.routes';
import { errorHandler } from '../../src/core/middleware/errorHandler';

/**
 * Mock authentication middleware for testing
 */
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Mock user based on token
    if (token === 'test-auth-token') {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
      };
    } else if (token === 'test-admin-token') {
      req.user = {
        id: 'test-admin-id',
        email: 'admin@example.com',
        role: 'admin',
      };
    } else if (token === 'other-user-token') {
      req.user = {
        id: 'test-user-id-2',
        email: 'other@example.com',
        role: 'user',
      };
    }
  }

  next();
};

/**
 * Mock requireAuth middleware
 */
const mockRequireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  next();
};

/**
 * Mock optionalAuth middleware
 */
const mockOptionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Just pass through, mockAuth already set user if token present
  next();
};

/**
 * Mock requireRole middleware
 */
const mockRequireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Mock rate limiter middleware
 */
const mockRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting in tests
  next();
};

/**
 * Create a test Express app with mocked middleware
 */
export const createTestApp = async (): Promise<Express> => {
  const app = express();

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock authentication middleware
  app.use(mockAuth);

  // Mock auth module exports
  jest.mock('../../src/modules/auth/middleware', () => ({
    requireAuth: mockRequireAuth,
    optionalAuth: mockOptionalAuth,
    requireRole: mockRequireRole,
  }));

  // Mock rate limiter
  jest.mock('../../src/core/middleware/rateLimiter', () => ({
    strictLimiter: mockRateLimiter,
    standardLimiter: mockRateLimiter,
  }));

  // Mount routes
  app.use('/api/examples', exampleRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
};
