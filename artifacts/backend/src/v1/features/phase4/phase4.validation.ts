import { z } from "zod";

export const flightSearchSchema = z.object({
  origin: z.string().min(3),
  destination: z.string().min(3),
  departureDate: z.string().min(8),
  returnDate: z.string().optional(),
  adults: z.coerce.number().min(1).optional(),
  tripType: z.enum(["oneWay", "roundTrip", "multiCity"]).optional(),
});

export const pricingSchema = z.object({
  entityType: z.enum(["package", "hotel"]),
  entityId: z.string().optional(),
  basePrice: z.number().min(0),
  date: z.string().optional(),
  demand: z.number().min(0).max(1).optional().default(0.5),
  occupancy: z.number().min(0).max(1).optional().default(0.5),
  holiday: z.boolean().optional().default(false),
});

export const pricingRuleSchema = z.object({
  entityType: z.enum(["package", "hotel"]),
  entityId: z.string().optional(),
  name: z.string().min(2),
  seasonMultiplier: z.number().min(0).optional().default(1),
  demandMultiplier: z.number().min(0).optional().default(1),
  occupancyMultiplier: z.number().min(0).optional().default(1),
  holidayMultiplier: z.number().min(0).optional().default(1),
  weekendMultiplier: z.number().min(0).optional().default(1),
  active: z.boolean().optional().default(true),
});

export const bookingQueueSchema = z.object({
  packageId: z.string().min(12),
  bookingId: z.string().optional(),
  priority: z.number().optional().default(0),
});
