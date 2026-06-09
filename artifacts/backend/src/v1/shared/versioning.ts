import type { NextFunction, Request, Response } from "express";

export function v2ResponseEnvelope(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/docs.json" || req.path === "/docs") return next();
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      return originalJson(body);
    }
    return originalJson({
      success: res.statusCode < 400,
      apiVersion: "v2",
      data: body,
      meta: {
        path: req.originalUrl,
        serverTime: new Date().toISOString(),
      },
    });
  };
  next();
}
