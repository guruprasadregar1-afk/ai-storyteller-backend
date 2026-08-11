import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[ApiError] ${req.method} ${req.url} — ${status}: ${message}`);
  res.status(status).json({ success: false, error: message });
}
