import { z } from "zod";

export const wishlistInputSchema = z.object({
  destinationId: z.string().min(12),
});
