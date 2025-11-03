import { Request } from 'express';

/**
 * User information attached to requests after authentication
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  clerkId: string;
  metadata?: Record<string, any>;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user information
       */
      user?: AuthenticatedUser;

      /**
       * Unique request ID for tracing
       */
      requestId?: string;

      /**
       * Pagination parameters parsed from query
       */
      pagination?: PaginationParams;

      /**
       * Sort parameters parsed from query
       */
      sort?: SortParams;

      /**
       * Filter parameters parsed from query
       */
      filters?: FilterParams;

      /**
       * Raw body for webhook verification
       */
      rawBody?: Buffer;
    }

    interface Response {
      /**
       * Custom success response helper
       */
      success?: (data: any, meta?: any) => void;

      /**
       * Custom error response helper
       */
      error?: (message: string, code?: string, details?: any) => void;

      /**
       * Custom paginated response helper
       */
      paginated?: (
        data: any[],
        total: number,
        page: number,
        limit: number
      ) => void;
    }
  }
}

export {};
