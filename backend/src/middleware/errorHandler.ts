/**
 * @file backend/src/middleware/errorHandler.ts
 * @description Global error handling middleware for Express.
 */

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error('API Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'UNKNOWN_ERROR';

  res.status(status).json({
    error: message,
    code: code
  });
}
