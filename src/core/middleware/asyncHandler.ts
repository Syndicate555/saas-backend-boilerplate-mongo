import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap async route handlers to automatically catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wrap async middleware to automatically catch promise rejections
 */
export function asyncMiddleware(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a middleware that runs multiple async middlewares in sequence
 */
export function asyncPipeline(
  ...middlewares: Array<
    (req: Request, res: Response, next: NextFunction) => Promise<void>
  >
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const middleware of middlewares) {
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Wrap an entire router with async error handling
 */
export function wrapRouter(router: any): any {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  methods.forEach((method) => {
    const original = router[method];
    router[method] = function (...args: any[]) {
      // Find route handlers and wrap them
      const wrappedArgs = args.map((arg) => {
        if (typeof arg === 'function') {
          return asyncHandler(arg);
        }
        return arg;
      });
      return original.apply(this, wrappedArgs);
    };
  });

  return router;
}

/**
 * Utility to handle async operations with timeout
 */
export function asyncWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Execute multiple async operations in parallel with error handling
 */
export async function parallelAsync<T>(
  operations: Array<() => Promise<T>>,
  options: {
    maxConcurrency?: number;
    stopOnError?: boolean;
  } = {}
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const { maxConcurrency = Infinity, stopOnError = false } = options;
  const results: Array<{ success: boolean; data?: T; error?: Error }> = [];
  const executing: Promise<void>[] = [];

  for (const operation of operations) {
    const promise = (async () => {
      try {
        const data = await operation();
        results.push({ success: true, data });
      } catch (error) {
        results.push({ success: false, error: error as Error });
        if (stopOnError) {
          throw error;
        }
      }
    })();

    executing.push(promise);

    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}
