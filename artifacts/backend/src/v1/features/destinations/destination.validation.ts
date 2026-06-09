import { z } from "zod";

export const destinationInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  state: z.string().min(2),
  region: z.string().min(2),
  description: z.string().min(10),
  heroImage: z.string().min(1),
  gallery: z.array(z.string()).optional().default([]),
  bestTime: z.string().optional().default(""),
  temperature: z.string().optional().default(""),
  language: z.string().optional().default(""),
  currency: z.string().optional().default("INR"),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  rating: z.number().min(0).max(5).optional().default(0),
});

export const destinationUpdateSchema = destinationInputSchema.partial();
