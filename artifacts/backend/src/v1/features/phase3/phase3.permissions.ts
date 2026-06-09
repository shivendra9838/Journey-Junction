import { UserAccountModel } from "@workspace/db/src/schema/phase1";
import { AdminProfileModel } from "@workspace/db/src/schema/phase3";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/auth";
import { AppError } from "../../shared/errors";

export const PERMISSIONS = {
  MANAGE_CONTENT: "manage:content",
  MANAGE_USERS: "manage:users",
  MANAGE_BOOKINGS: "manage:bookings",
  MANAGE_BLOGS: "manage:blogs",
  MANAGE_DESTINATIONS: "manage:destinations",
  MANAGE_PACKAGES: "manage:packages",
  MANAGE_SUPPORT: "manage:support",
  MANAGE_ANALYTICS: "manage:analytics",
  MANAGE_SECURITY: "manage:security",
} as const;

const matrix: Record<string, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [PERMISSIONS.MANAGE_CONTENT, PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_BOOKINGS, PERMISSIONS.MANAGE_ANALYTICS],
  EDITOR: [PERMISSIONS.MANAGE_BLOGS, PERMISSIONS.MANAGE_DESTINATIONS, PERMISSIONS.MANAGE_PACKAGES, PERMISSIONS.MANAGE_CONTENT],
  SUPPORT: [PERMISSIONS.MANAGE_SUPPORT, PERMISSIONS.MANAGE_BOOKINGS],
  USER: [],
};

export async function getAdminAccess(userId: string) {
  const [profile, user] = await Promise.all([
    AdminProfileModel.findOne({ userId, active: true }).lean(),
    UserAccountModel.findById(userId).select("email role").lean(),
  ]);
  const fallbackRole =
    user?.email && process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
      ? "SUPER_ADMIN"
      : user?.role === "admin"
        ? "ADMIN"
        : "USER";
  const role = profile?.role ?? fallbackRole;
  return {
    role,
    permissions: [...new Set([...(matrix[role] ?? []), ...(profile?.permissions ?? [])])],
  };
}

export const authorize =
  (...roles: string[]) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new AppError(401, "Authentication required", "AUTH_REQUIRED"));
    const access = await getAdminAccess(req.auth.id);
    if (!roles.includes(access.role)) return next(new AppError(403, "Role not allowed", "ROLE_FORBIDDEN"));
    return next();
  };

export const permissionGuard =
  (...permissions: string[]) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new AppError(401, "Authentication required", "AUTH_REQUIRED"));
    const access = await getAdminAccess(req.auth.id);
    if (!permissions.every(permission => access.permissions.includes(permission))) {
      return next(new AppError(403, "Permission denied", "PERMISSION_DENIED"));
    }
    return next();
  };
