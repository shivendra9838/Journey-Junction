import type { Response } from "express";
import { asyncHandler } from "../../shared/errors";
import type { AuthenticatedRequest } from "../../shared/auth";
import { authService } from "./auth.service";

export const authController = {
  register: asyncHandler(async (req, res) => res.status(201).json(await authService.register(req.body))),
  login: asyncHandler(async (req, res) => res.json(await authService.login(req.body))),
  logout: asyncHandler(async (req, res) => res.json(await authService.logout(req.body.refreshToken))),
  refresh: asyncHandler(async (req, res) => res.json(await authService.refresh(req.body.refreshToken))),
  forgotPassword: asyncHandler(async (req, res) => res.json(await authService.forgotPassword(req.body.email))),
  resetPassword: asyncHandler(async (req, res) => res.json(await authService.resetPassword(req.body.token, req.body.password))),
  sendVerification: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await authService.sendVerification(req.auth!.id)),
  ),
  verifyEmail: asyncHandler(async (req, res) => res.json(await authService.verifyEmail(req.body.token))),
};
