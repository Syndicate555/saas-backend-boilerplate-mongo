// Audit Status: TypeScript errors fixed - 2025-11-02
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

/**
 * Skip logging for these paths
 */
const SKIP_PATHS = ['/health', '/metrics', '/favicon.ico'];

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    'password',
    'token',
    'authorization',
    'api_key',
    'apiKey',
    'secret',
    'credit_card',
    'creditCard',
    'ssn',
  ];

  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  return data;
}

/**
 * Generate or extract request ID
 */
function getRequestId(req: Request): string {
  // Check for existing request ID from headers (useful for distributed tracing)
  const headerRequestId =
    req.headers['x-request-id'] || req.headers['x-correlation-id'];

  if (headerRequestId && typeof headerRequestId === 'string') {
    return headerRequestId;
  }

  // Generate new request ID
  return uuidv4();
}

/**
 * Request logger middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip logging for certain paths
  if (SKIP_PATHS.includes(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const requestId = getRequestId(req);

  // Attach request ID to request object
  req.requestId = requestId;

  // Attach request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  // Log request
  const requestLog: {
    requestId: string;
    method: string;
    path: string;
    query: any;
    ip: string | undefined;
    userAgent: string | undefined;
    userId: string | undefined;
    referer: string | undefined;
    body?: any;
  } = {
    requestId,
    method: req.method,
    path: req.path,
    query: sanitizeData(req.query),
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    referer: req.get('referer'),
  };

  // Log request body for non-GET requests (sanitized)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    requestLog['body'] = sanitizeData(req.body);
  }

  logger.http('Incoming request', requestLog);

  // Capture response
  const originalSend = res.send;

  res.send = function (data: any): Response {
    res.send = originalSend;
    return originalSend.call(this, data);
  };

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const responseLog = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    };

    // Determine log level based on status code
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

    logger[level]('Request completed', responseLog);

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        ...responseLog,
        threshold: '1000ms',
      });
    }
  });

  next();
}

/**
 * Error logger middleware (should be placed before error handler)
 */
export function errorLogger(
  error: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
  });

  next(error);
}

/**
 * Morgan-compatible stream for HTTP logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Audit logger for important actions
 */
export async function auditLog(
  action: string,
  details: {
    userId?: string;
    resource?: string;
    resourceId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
  }
): Promise<void> {
  logger.info('Audit log', {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });

  // You can also save to database here if needed
  // await AuditLog.create({ action, ...details });
}

/**
 * Performance logger for monitoring
 */
export function performanceLogger(
  operation: string,
  duration: number,
  metadata?: any
): void {
  const log = {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  };

  if (duration > 5000) {
    logger.error('Performance issue detected', log);
  } else if (duration > 1000) {
    logger.warn('Slow operation', log);
  } else {
    logger.debug('Operation completed', log);
  }
}
