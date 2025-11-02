// Audit Status: TypeScript errors fixed - 2025-11-02
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { features } from '../config/env';
import { RateLimitError } from '../types/errors';
import { Request, Response } from 'express';

/**
 * Create rate limiter with Redis store if available, otherwise use memory store
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  name?: string;
}) {
  const redisClient = getRedisClient();

  const baseOptions = {
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator:
      options.keyGenerator ||
      ((req: Request) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.id || req.ip || 'unknown';
      }),
    handler: (_req: Request, _res: Response) => {
      throw new RateLimitError(options.message || 'Rate limit exceeded');
    },
  };

  // Use Redis store if available
  if (features.redis && redisClient) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        // @ts-expect-error - RedisStore expects sendCommand but works with client
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: `rate-limit:${options.name || 'general'}:`,
      }),
    });
  }

  // Fallback to memory store
  return rateLimit(baseOptions);
}

/**
 * General API rate limiter
 * 500 requests per 15 minutes
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many API requests, please slow down.',
  name: 'api',
});

/**
 * Strict API rate limiter for sensitive endpoints
 * 100 requests per 15 minutes
 */
export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests to this endpoint, please try again later.',
  name: 'strict',
});

/**
 * Authentication rate limiter
 * 10 requests per 15 minutes
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  name: 'auth',
  keyGenerator: (req: Request) => {
    // Use email if present in body, otherwise use IP
    return req.body?.email || req.ip || 'unknown';
  },
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
  name: 'password-reset',
  keyGenerator: (req: Request) => {
    return req.body?.email || req.ip || 'unknown';
  },
});

/**
 * File upload rate limiter
 * 20 uploads per hour
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later.',
  name: 'upload',
});

/**
 * Webhook rate limiter
 * 1000 requests per minute
 */
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  message: 'Too many webhook requests.',
  name: 'webhook',
  keyGenerator: (req: Request) => {
    // Use a combination of path and source IP for webhooks
    return `${req.path}:${req.ip}`;
  },
});

/**
 * Create a custom rate limiter
 */
export function createCustomLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  name: string;
}) {
  return createRateLimiter(options);
}

/**
 * Dynamic rate limiter based on user subscription
 */
export function subscriptionBasedLimiter(
  freeLimit: number = 100,
  proLimit: number = 1000,
  enterpriseLimit: number = 10000
) {
  const redisClient = getRedisClient();

  const baseOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: (req: Request) => {
      if (!req.user) return freeLimit;

      const subscription = (req.user as any).subscription;
      switch (subscription) {
        case 'pro':
          return proLimit;
        case 'enterprise':
          return enterpriseLimit;
        default:
          return freeLimit;
      }
    },
    message: 'Rate limit exceeded for your subscription tier.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (_req: Request, _res: Response) => {
      throw new RateLimitError('Rate limit exceeded for your subscription tier.');
    },
  };

  // Use Redis store if available
  if (features.redis && redisClient) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        // @ts-expect-error - RedisStore expects sendCommand but works with client
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'rate-limit:subscription:',
      }),
    });
  }

  // Fallback to memory store
  return rateLimit(baseOptions);
}

/**
 * IP-based rate limiter (ignores authentication)
 */
export const ipLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP address.',
  name: 'ip',
  keyGenerator: (req: Request) => req.ip || 'unknown',
});
