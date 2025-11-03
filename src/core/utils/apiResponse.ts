import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

/**
 * Send success response
 */
export function success<T = any>(data: T, meta?: any): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Send error response
 */
export function error(
  message: string,
  code: string = 'ERROR',
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Send paginated response
 */
export function paginated<T = any>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };

  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Response helper middleware
 * Attaches helper methods to the response object
 *
 * AUDIT: TypeScript compliance fix - prefixed unused req parameter with underscore
 */
export function responseHelpers(_req: any, res: Response, next: any): void {
  // Attach success helper
  res.success = function <T = any>(data: T, meta?: any): Response {
    return this.json(success(data, meta));
  };

  // Attach error helper
  res.error = function (
    message: string,
    code: string = 'ERROR',
    details?: any
  ): Response {
    return this.json(error(message, code, details));
  };

  // Attach paginated helper
  res.paginated = function <T = any>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): Response {
    return this.json(paginated(data, total, page, limit));
  };

  next();
}

/**
 * Create a standardized response for created resources
 */
export function created<T = any>(data: T, location?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      ...(location && { location }),
    },
  };
}

/**
 * Create a standardized response for updated resources
 */
export function updated<T = any>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a standardized response for deleted resources
 */
export function deleted(
  message: string = 'Resource deleted successfully'
): ApiResponse {
  return {
    success: true,
    data: { message },
  };
}

/**
 * Create a standardized response for no content
 */
export function noContent(): ApiResponse {
  return {
    success: true,
    data: null,
  };
}

/**
 * Create a standardized response for accepted (async operations)
 */
export function accepted(
  message: string = 'Request accepted for processing',
  jobId?: string
): ApiResponse {
  return {
    success: true,
    data: {
      message,
      ...(jobId && { jobId }),
    },
  };
}

/**
 * Format validation errors for response
 */
export function validationErrors(errors: any[]): ApiResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
    },
  };
}
