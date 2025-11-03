/**
 * Base class for custom errors
 */
export abstract class BaseError extends Error {
  abstract statusCode: number;
  abstract code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Validation error - 400
 */
export class ValidationError extends BaseError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: any[];

  constructor(message: string, details: any[] = []) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

/**
 * Authentication error - 401
 */
export class AuthError extends BaseError {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message: string = 'Unauthorized') {
    super(message);
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Forbidden error - 403
 */
export class ForbiddenError extends BaseError {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message: string = 'Forbidden') {
    super(message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error - 404
 */
export class NotFoundError extends BaseError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - 409
 */
export class ConflictError extends BaseError {
  statusCode = 409;
  code = 'CONFLICT';

  constructor(message: string = 'Resource conflict') {
    super(message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit error - 429
 */
export class RateLimitError extends BaseError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Internal server error - 500
 */
export class InternalError extends BaseError {
  statusCode = 500;
  code = 'INTERNAL_ERROR';

  constructor(message: string = 'Internal server error') {
    super(message);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Bad gateway error - 502
 */
export class BadGatewayError extends BaseError {
  statusCode = 502;
  code = 'BAD_GATEWAY';

  constructor(message: string = 'Bad gateway') {
    super(message);
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

/**
 * Service unavailable error - 503
 */
export class ServiceUnavailableError extends BaseError {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';

  constructor(message: string = 'Service unavailable') {
    super(message);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Type guard to check if error is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Utility to create an error based on status code
 */
export function createHttpError(
  statusCode: number,
  message: string
): BaseError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 429:
      return new RateLimitError(message);
    case 502:
      return new BadGatewayError(message);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new InternalError(message);
  }
}
