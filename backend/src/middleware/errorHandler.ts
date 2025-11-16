import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      path: req.path,
    });
  }

  // Database errors
  if (err.message?.includes('ECONNREFUSED')) {
    console.error('Database connection error:', err);
    return res.status(503).json({
      error: 'Database connection failed',
      details: 'Service temporarily unavailable',
    });
  }

  // Axios/Network errors
  if (err.message?.includes('ENOTFOUND') || err.message?.includes('ETIMEDOUT')) {
    console.error('External API error:', err);
    return res.status(503).json({
      error: 'External service unavailable',
      details: 'Unable to reach GrandLyon API',
    });
  }

  // Generic error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

/**
 * Async route handler wrapper
 * Catches errors in async route handlers and passes them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
};
