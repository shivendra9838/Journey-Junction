import { z } from "zod";

export const packageSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  destinationId: z.string().min(12),
  duration: z.string().min(2),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional().default(0),
  rating: z.number().min(0).max(5).optional().default(0),
  coverImage: z.string().min(1),
  gallery: z.array(z.string()).optional().default([]),
  description: z.string().min(10),
  highlights: z.array(z.string()).optional().default([]),
  included: z.array(z.string()).optional().default([]),
  excluded: z.array(z.string()).optional().default([]),
  maxTravellers: z.number().min(1),
  availableSeats: z.number().min(0),
  category: z.string().optional().default("standard"),
  featured: z.boolean().optional().default(false),
  status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  itinerary: z.array(z.object({
    dayNumber: z.number().min(1),
    title: z.string().min(2),
    description: z.string().min(5),
    activities: z.array(z.string()).optional().default([]),
    mealsIncluded: z.array(z.string()).optional().default([]),
  })).optional(),
});

export const itinerarySchema = z.object({
  packageId: z.string().min(12),
  days: z.array(z.object({
    dayNumber: z.number().min(1),
    title: z.string().min(2),
    description: z.string().min(5),
    activities: z.array(z.string()).optional().default([]),
    mealsIncluded: z.array(z.string()).optional().default([]),
  })).min(1),
});

export const bookingSchema = z.object({
  packageId: z.string().min(12),
  hotelId: z.string().min(12).optional(),
  travellers: z.number().min(1),
  checkInDate: z.string().datetime().or(z.string().min(8)),
  checkOutDate: z.string().datetime().or(z.string().min(8)),
});

export const inventorySchema = z.object({
  packageId: z.string().min(12).optional(),
  hotelId: z.string().min(12).optional(),
  availableSeats: z.number().min(0).optional(),
  blockedSeats: z.number().min(0).optional(),
  totalRooms: z.number().min(0).optional(),
  availableRooms: z.number().min(0).optional(),
  blockedDates: z.array(z.string()).optional(),
});

export const createOrderSchema = z.object({ bookingId: z.string().min(12) });
export const verifyPaymentSchema = z.object({
  bookingId: z.string().min(12),
  stripePaymentIntentId: z.string().min(3),
});
export const refundSchema = z.object({ paymentId: z.string().min(12), amount: z.number().min(1).optional() });

export const plannerSchema = z.object({
  destination: z.string().min(2),
  budget: z.number().min(1),
  days: z.number().min(1).max(30),
  travelType: z.string().min(2),
  interests: z.array(z.string()).min(1),
});

export const blogSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  content: z.string().min(20),
  excerpt: z.string().min(5),
  coverImage: z.string().min(1),
  author: z.string().min(2),
  category: z.string().min(2),
  tags: z.array(z.string()).optional().default([]),
  readTime: z.number().min(1),
  published: z.boolean().optional().default(false),
});
