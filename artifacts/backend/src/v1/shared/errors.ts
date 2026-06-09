import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../../lib/logger";

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code = "APP_ERROR") {
    super(message);
  }
}

export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, "Route not found", "NOT_FOUND"));
};

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_ERROR", details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  logger.error({ err }, "Unhandled v1 API error");
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
};
