import { Router } from "express";
import { requireJwtAuth } from "../../shared/auth";
import { validate } from "../../shared/validate";
import { authController } from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

const router = Router();

router.post("/register", validate("body", registerSchema), authController.register);
router.post("/login", validate("body", loginSchema), authController.login);
router.post("/logout", validate("body", refreshSchema), authController.logout);
router.post("/refresh", validate("body", refreshSchema), authController.refresh);
router.post("/forgot-password", validate("body", forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate("body", resetPasswordSchema), authController.resetPassword);
router.post("/send-verification", requireJwtAuth, authController.sendVerification);
router.post("/verify-email", validate("body", verifyEmailSchema), authController.verifyEmail);

export default router;
