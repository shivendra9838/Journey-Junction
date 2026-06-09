import type { NextFunction, Request, Response } from "express";
import { UserModel } from "@workspace/db";
import { AppError } from "./errors";
import { verifyJwt } from "./jwt";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthUser;
};

export async function requireJwtAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  // Support web session auth gracefully
  if ((req as any).session?.userId) {
    if ((req as any).session.isAdmin) {
      req.auth = { id: (req as any).session.userId, email: "admin@local", role: "admin" };
      return next();
    }
    try {
      const user = await UserModel.findById((req as any).session.userId).select("email role").lean();
      if (!user) {
        (req as any).session.destroy(() => {});
        return next(new AppError(401, "Session invalid or user deleted"));
      }
      req.auth = { id: (req as any).session.userId, email: user.email, role: (user as any).role || "user" };
      return next();
    } catch (err) {
      // Ignore errors like CastError for non-Mongo IDs
    }
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) return next(new AppError(401, "Authentication required"));

  try {
    const payload = verifyJwt(token, "access");
    const user = await UserModel.findById(payload.sub).select("_id email role").lean();
    if (!user) throw new AppError(401, "User no longer exists");
    req.auth = { id: user._id.toString(), email: user.email, role: (user as any).role || "user" };
    return next();
  } catch (error) {
    return next(error);
  }
}

export const requireRole =
  (...roles: string[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.auth.role)) return next(new AppError(403, "Forbidden"));
    return next();
  };
