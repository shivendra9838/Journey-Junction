import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().toLowerCase(),
  phone: z.string().optional().default(""),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20),
});
