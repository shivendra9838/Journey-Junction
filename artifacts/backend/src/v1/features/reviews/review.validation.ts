import { z } from "zod";

export const reviewInputSchema = z.object({
  destinationId: z.string().min(12),
  rating: z.number().min(1).max(5),
  title: z.string().min(2).max(100),
  review: z.string().min(5),
  images: z.array(z.string()).optional().default([]),
});

export const reviewUpdateSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  review: z.string().min(5).optional(),
  images: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
});
