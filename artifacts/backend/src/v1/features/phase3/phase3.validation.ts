import { z } from "zod";

export const chatSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(2),
});

export const viewedSchema = z.object({
  entityId: z.string().min(12),
  entityType: z.enum(["destination", "hotel", "package", "activity"]),
});

export const ticketSchema = z.object({
  subject: z.string().min(3),
  category: z.string().min(2),
  description: z.string().min(5),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
});

export const ticketReplySchema = z.object({
  message: z.string().min(1),
  internal: z.boolean().optional().default(false),
});

export const couponSchema = z.object({
  code: z.string().min(2),
  discountType: z.enum(["flat", "percentage"]),
  discountValue: z.number().min(0),
  startDate: z.string(),
  endDate: z.string(),
  maxUses: z.number().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
  packageId: z.string().optional(),
  destinationId: z.string().optional(),
  firstTimeUserOnly: z.boolean().optional().default(false),
});

export const applyCouponSchema = z.object({
  code: z.string().min(2),
  amount: z.number().min(0),
  packageId: z.string().optional(),
  destinationId: z.string().optional(),
});

export const referralSchema = z.object({
  referralCode: z.string().min(3),
  referredUserId: z.string().min(12).optional(),
});

export const loyaltySchema = z.object({
  userId: z.string().min(12).optional(),
  points: z.number(),
  reason: z.string().min(2),
  referenceId: z.string().optional(),
});

export const seoSchema = z.object({
  entityType: z.enum(["page", "blog", "destination", "package"]),
  entityId: z.string().optional(),
  path: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(5),
  canonicalUrl: z.string().min(1),
  openGraph: z.record(z.unknown()).optional().default({}),
  twitter: z.record(z.unknown()).optional().default({}),
  structuredData: z.record(z.unknown()).optional().default({}),
  robots: z.string().optional().default("index,follow"),
});

export const featureFlagSchema = z.object({
  key: z.string().min(2),
  description: z.string().optional().default(""),
  enabled: z.boolean(),
  rules: z.record(z.unknown()).optional().default({}),
});

export const fileUploadSchema = z.object({
  files: z.array(z.string().min(1)).min(1),
  folder: z.string().min(2),
  tags: z.array(z.string()).optional().default([]),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().min(5),
  keys: z.record(z.unknown()),
});
