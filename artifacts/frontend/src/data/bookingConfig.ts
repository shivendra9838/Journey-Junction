export type BookingStep = 
  | "destination"
  | "origin"
  | "transport_pickup"
  | "flight"
  | "hotel"
  | "activities"
  | "travellers"
  | "payment"
  | "confirmation"
  | "done";

export const STEP_LABELS: Record<BookingStep, string> = {
  destination: "Destination",
  origin: "Origin City",
  transport_pickup: "Transport & Pickup",
  flight: "Flight",
  hotel: "Hotel",
  activities: "Activities",
  travellers: "Travellers",
  payment: "Payment",
  confirmation: "Confirmation",
  done: "Done"
};

export interface BookingConfig {
  steps: BookingStep[];
}

export const DESTINATION_BOOKING_CONFIG: Record<string, BookingConfig> = {
  "goa": {
    steps: ["destination", "origin", "transport_pickup", "flight", "hotel", "travellers", "payment"]
  },
  "kashmir": {
    steps: ["destination", "origin", "transport_pickup", "flight", "hotel", "activities", "travellers", "payment"]
  },
  "kerala": {
    steps: ["destination", "origin", "transport_pickup", "flight", "hotel", "activities", "travellers", "payment"]
  },
  "default": {
    steps: ["destination", "transport_pickup", "hotel", "travellers", "payment"]
  }
};

export function getBookingConfig(slug: string): BookingConfig {
  return DESTINATION_BOOKING_CONFIG[slug] || DESTINATION_BOOKING_CONFIG["default"];
}
