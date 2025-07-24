import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'An unexpected error occurred';

  // Log error details
  logger.error('Error occurred:', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    },
    timestamp: new Date().toISOString(),
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown',
      tenant_id: req.headers['x-tenant-id'] || undefined,
    },
  });
};

export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};