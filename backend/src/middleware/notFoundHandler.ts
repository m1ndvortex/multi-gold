import { Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = createError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};