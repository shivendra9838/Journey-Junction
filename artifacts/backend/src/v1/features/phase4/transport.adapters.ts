import { AppError } from "../../shared/errors";

export type FlightSearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  tripType?: "oneWay" | "roundTrip" | "multiCity";
};

export interface FlightProvider {
  name: string;
  search(input: FlightSearchInput): Promise<unknown[]>;
  details(id: string): Promise<unknown>;
}

export class AmadeusFlightProvider implements FlightProvider {
  name = "amadeus";

  async token() {
    const key = process.env.AMADEUS_CLIENT_ID;
    const secret = process.env.AMADEUS_CLIENT_SECRET;
    if (!key || !secret) throw new AppError(500, "Amadeus credentials are not configured", "AMADEUS_CONFIG_MISSING");
    const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: key, client_secret: secret }),
    });
    const json = await res.json() as { access_token?: string };
    if (!res.ok || !json.access_token) throw new AppError(502, "Amadeus token request failed", "AMADEUS_TOKEN_FAILED");
    return json.access_token;
  }

  async search(input: FlightSearchInput) {
    const token = await this.token();
    const url = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
    url.searchParams.set("originLocationCode", input.origin);
    url.searchParams.set("destinationLocationCode", input.destination);
    url.searchParams.set("departureDate", input.departureDate);
    if (input.returnDate) url.searchParams.set("returnDate", input.returnDate);
    url.searchParams.set("adults", String(input.adults ?? 1));
    url.searchParams.set("currencyCode", "INR");
    url.searchParams.set("max", "20");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json() as { data?: unknown[] };
    if (!res.ok) throw new AppError(502, "Amadeus flight search failed", "AMADEUS_SEARCH_FAILED");
    return json.data ?? [];
  }

  async details(id: string) {
    return { provider: this.name, id, note: "Use the original flight offer payload returned from /flights/search for final pricing." };
  }
}

export const flightProvider = new AmadeusFlightProvider();

export async function searchTrains(query: Record<string, unknown>) {
  return [
    {
      id: `TRN-${query.origin ?? "SRC"}-${query.destination ?? "DST"}-1`,
      trainName: "Wandr Express",
      origin: query.origin,
      destination: query.destination,
      duration: "6h 40m",
      seatAvailability: { sleeper: 24, thirdAC: 12, secondAC: 6 },
      route: [query.origin, "Major Junction", query.destination],
    },
  ];
}

export async function trainDetails(id: string) {
  const [type, origin = "SRC", destination = "DST"] = id.split("-");
  return {
    id,
    trainName: type === "TRN" ? "Wandr Express" : "Unknown Train",
    origin,
    destination,
    duration: "6h 40m",
    seatAvailability: { sleeper: 24, thirdAC: 12, secondAC: 6 },
    route: [origin, "Major Junction", destination],
  };
}

export async function searchBuses(query: Record<string, unknown>) {
  return [
    {
      id: `BUS-${query.origin ?? "SRC"}-${query.destination ?? "DST"}-1`,
      operator: "Wandr Roadways",
      origin: query.origin,
      destination: query.destination,
      duration: "5h 20m",
      seatAvailability: 18,
      routeDetails: { boarding: query.origin, dropping: query.destination, amenities: ["AC", "Charging", "Water"] },
    },
  ];
}
