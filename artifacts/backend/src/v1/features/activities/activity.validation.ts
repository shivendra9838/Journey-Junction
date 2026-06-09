import { z } from "zod";

export const activityInputSchema = z.object({
  title: z.string().min(2),
  destinationId: z.string().min(12),
  description: z.string().min(10),
  duration: z.string().optional().default(""),
  difficulty: z.enum(["easy", "moderate", "hard"]).optional().default("easy"),
  images: z.array(z.string()).optional().default([]),
  price: z.number().min(0),
});

export const activityUpdateSchema = activityInputSchema.partial();
