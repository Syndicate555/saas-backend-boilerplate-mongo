import winston from 'winston';
import { env } from './env';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: env.NODE_ENV === 'development' ? devFormat : prodFormat,
  })
);

// File transports in production
if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels: logLevels,
  transports,
});

// Create a stream object for Morgan middleware
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};

// Helper function to log with request context
export function logWithContext(
  level: keyof typeof logLevels,
  message: string,
  context?: {
    requestId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    error?: Error;
    [key: string]: any;
  }
): void {
  const logData = {
    message,
    ...context,
    ...(context?.error && {
      error: {
        message: context.error.message,
        stack: context.error.stack,
        name: context.error.name,
      },
    }),
  };

  logger[level](logData);
}

// Export log levels for external use
export { logLevels };
