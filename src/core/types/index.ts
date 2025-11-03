export * from './errors';
// Note: express.d.ts contains only type declarations for Express global augmentation
// and does not export any values, so it should not be re-exported here
export type {
  AuthenticatedUser,
  PaginationParams,
  SortParams,
  FilterParams,
} from './express.d';

/**
 * Generic API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Base model interface for database entities
 */
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

/**
 * Subscription status enum
 */
export enum SubscriptionStatus {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  CANCELLED = 'cancelled',
}

/**
 * Audit log action enum
 */
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Database type
 */
export type DatabaseType = 'mongodb';

/**
 * Request context for logging
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Job status for background tasks
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * File upload configuration
 */
export interface UploadConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  destination: 'local' | 's3' | 'cloudinary';
}

/**
 * Email template names
 */
export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  SUBSCRIPTION_CREATED = 'subscription-created',
  SUBSCRIPTION_CANCELLED = 'subscription-cancelled',
  INVOICE_PAID = 'invoice-paid',
  INVOICE_FAILED = 'invoice-failed',
}

/**
 * Socket event names
 */
export enum SocketEvent {
  CONNECT = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  MESSAGE = 'message',
  NOTIFICATION = 'notification',
  UPDATE = 'update',
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: boolean;
    redis?: boolean;
    s3?: boolean;
    stripe?: boolean;
    sendgrid?: boolean;
  };
  version?: string;
  uptime?: number;
}

/**
 * Webhook event interface
 */
export interface WebhookEvent<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: Date;
  signature?: string;
}
