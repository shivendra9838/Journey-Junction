import type { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import sanitizeHtml from "sanitize-html";

export const apiRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  limit: (req) => {
    const role = String(req.headers["x-user-role"] ?? "").toLowerCase();
    if (role === "super_admin" || role === "admin") return 5000;
    if (req.headers.authorization) return 1500;
    return Number(process.env.RATE_LIMIT_MAX ?? 1000);
  },
  keyGenerator: (req) => {
    const auth = req.headers.authorization ?? "";
    return auth ? `user:${auth.slice(-24)}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) delete (value as Record<string, unknown>)[key];
      else (value as Record<string, unknown>)[key] = sanitizeValue(nested);
    }
  }
  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction) {
  sanitizeValue(req.body);
  sanitizeValue(req.query);
  sanitizeValue(req.params);
  next();
}

export function requestContext(req: Request, _res: Response, next: NextFunction) {
  req.headers["x-client-ip"] = req.ip;
  req.headers["x-device"] = req.headers["user-agent"] ?? "";
  next();
}
