import { z } from "zod";

export const inquiryInputSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  destination: z.string().min(2),
  travelDates: z.string().min(2),
  message: z.string().min(5),
});
