import { z } from "zod";

export const hotelInputSchema = z.object({
  name: z.string().min(2),
  destinationId: z.string().min(12),
  description: z.string().min(10),
  images: z.array(z.string()).optional().default([]),
  amenities: z.array(z.string()).optional().default([]),
  rating: z.number().min(0).max(5).optional().default(0),
  address: z.string().optional().default(""),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  pricePerNight: z.number().min(0),
});

export const hotelUpdateSchema = hotelInputSchema.partial();
