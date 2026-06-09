import type { NextFunction, Request, Response } from "express";
import { ApiMetricModel } from "@workspace/db/src/schema/phase4";

export function apiMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    void ApiMetricModel.create({
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs: Date.now() - started,
      userId: null,
      ip: req.ip,
    }).catch(() => undefined);
  });
  next();
}
