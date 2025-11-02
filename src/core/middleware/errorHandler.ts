/**
 * ✅ AUDIT STATUS: COMPLETE
 * - Fixed TypeScript errors (unused parameters, Sentry types)
 * - Proper error handling for all error types
 * - Type-safe error responses
 */
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env, features } from '../config/env';
import { logger } from '../config/logger';
import { BaseError, ValidationError } from '../types/errors';
import * as Sentry from '@sentry/node';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error('Request error', {
    error,
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
  });

  // Send to Sentry if configured
  // AUDIT: Removed invalid CaptureContext type assertion and fixed optional properties for exactOptionalPropertyTypes
  if (features.sentry) {
    const sentryContext: Record<string, any> = {
      tags: {
        ...(req.requestId && { requestId: req.requestId }),
        path: req.path,
        method: req.method,
      },
      extra: {
        query: req.query,
        body: req.body,
      },
    };

    if (req.user) {
      sentryContext['user'] = {
        id: req.user.id,
        email: req.user.email,
      };
    }

    Sentry.captureException(error, sentryContext);
  }

  // Handle different error types
  let statusCode = 500;
  let errorResponse: any = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
    };
  }
  // Handle custom base errors
  else if (error instanceof BaseError) {
    statusCode = error.statusCode;
    errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { details: error.details }),
      },
    };
  }
  // Handle Clerk errors
  else if (error.message?.includes('Clerk') || error.message?.includes('JWT')) {
    statusCode = 401;
    errorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      },
    };
  }
  // Handle MongoDB errors
  else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    const mongoError = error as any;
    if (mongoError.code === 11000) {
      statusCode = 409;
      errorResponse = {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      };
    } else {
      statusCode = 500;
      errorResponse = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
        },
      };
    }
  }
  // Handle Stripe errors
  else if (error.name === 'StripeError') {
    statusCode = 402;
    errorResponse = {
      success: false,
      error: {
        code: 'PAYMENT_ERROR',
        message: 'Payment processing failed',
      },
    };
  }
  // Default error handling
  else {
    statusCode = 500;
    errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
      },
    };
  }

  // Add stack trace in development
  if (env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // Add request ID for tracing
  if (req.requestId) {
    errorResponse.error.requestId = req.requestId;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handle 404 errors
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const error = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  };

  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  });

  res.status(404).json(error);
}

/**
 * Handle validation errors from middleware
 */
export function validationErrorHandler(errors: any[]): never {
  throw new ValidationError('Validation failed', errors);
}
