import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  travelPreferences: z.array(z.string()).optional(),
});

export const avatarSchema = z.object({
  file: z.string().min(1),
});
