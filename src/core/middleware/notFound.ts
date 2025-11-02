// Audit Status: TypeScript errors fixed - 2025-11-02
import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../types/errors';

/**
 * 404 Not Found handler middleware
 * This should be placed after all route handlers
 */
export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

/**
 * Alternative 404 handler that sends response directly
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  });
}
