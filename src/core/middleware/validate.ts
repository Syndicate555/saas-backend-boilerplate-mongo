// Audit Status: TypeScript errors fixed - 2025-11-02
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../types/errors';

/**
 * Validation target types
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Whether to strip unknown properties
   * @default true
   */
  stripUnknown?: boolean;

  /**
   * Whether to coerce types (e.g., string to number)
   * @default true
   */
  coerce?: boolean;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Whether to abort early on first error
   * @default false
   */
  abortEarly?: boolean;
}

/**
 * Create validation middleware for request data
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  const {
    message = 'Validation failed',
  } = options;

  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Get data to validate based on target
      const dataToValidate = req[target];

      // Parse and validate data
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace request data with validated data
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        next(new ValidationError(message, validationErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Create a validation middleware that validates multiple targets
 */
export function validateMultiple(
  validations: {
    schema: ZodSchema;
    target: ValidationTarget;
    options?: ValidationOptions;
  }[]
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const allErrors: any[] = [];

    for (const validation of validations) {
      try {
        const { schema, target } = validation;
        const dataToValidate = req[target];
        const validatedData = await schema.parseAsync(dataToValidate);
        req[target] = validatedData;
      } catch (error) {
        if (error instanceof ZodError) {
          allErrors.push(
            ...error.errors.map((err) => ({
              target: validation.target,
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            }))
          );
        } else {
          return next(error);
        }
      }
    }

    if (allErrors.length > 0) {
      return next(new ValidationError('Validation failed', allErrors));
    }

    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * MongoDB ObjectId validation
   */
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  /**
   * UUID validation
   */
  uuid: z.string().uuid('Invalid UUID format'),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email format'),

  /**
   * URL validation
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Phone number validation (E.164 format)
   */
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),

  /**
   * Pagination query schema
   */
  paginationQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * Sort query schema
   */
  sortQuery: z.object({
    sortBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Date range query schema
   */
  dateRangeQuery: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),

  /**
   * Search query schema
   */
  searchQuery: z.object({
    q: z.string().min(1).optional(),
    search: z.string().min(1).optional(),
  }),
};

/**
 * Create a schema that makes all properties optional (for PATCH requests)
 */
export function createPartialSchema<T extends ZodSchema>(schema: T): ZodSchema {
  if (schema instanceof z.ZodObject) {
    return schema.partial();
  }
  return schema;
}

/**
 * Create a schema that picks specific properties
 */
export function createPickSchema<T extends z.ZodObject<any>>(
  schema: T,
  keys: Array<keyof z.infer<T>>
): ZodSchema {
  return schema.pick(keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
}

/**
 * Create a schema that omits specific properties
 */
export function createOmitSchema<T extends z.ZodObject<any>>(
  schema: T,
  keys: Array<keyof z.infer<T>>
): ZodSchema {
  return schema.omit(keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
}

/**
 * Combine multiple schemas
 */
export function combineSchemas<T extends ZodSchema[]>(
  ...schemas: T
): ZodSchema {
  return z.intersection(
    schemas[0]!,
    schemas.slice(1).reduce((acc, schema) => z.intersection(acc, schema))
  );
}
