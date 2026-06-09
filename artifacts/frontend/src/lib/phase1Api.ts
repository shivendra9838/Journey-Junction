export type PhaseUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "user" | "admin";
  isVerified: boolean;
  bio?: string;
  city?: string;
  country?: string;
  travelPreferences?: string[];
};

export type DestinationV1 = {
  id: string;
  name: string;
  slug: string;
  state: string;
  region: string;
  description: string;
  heroImage: string;
  gallery: string[];
  bestTime?: string;
  temperature?: string;
  language?: string;
  currency?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
};

export type HotelV1 = {
  id: string;
  name: string;
  destinationId: string;
  description: string;
  images: string[];
  amenities: string[];
  rating: number;
  address: string;
  pricePerNight: number;
};

export type ActivityV1 = {
  id: string;
  title: string;
  destinationId: string;
  description: string;
  duration: string;
  difficulty: "easy" | "moderate" | "hard";
  images: string[];
  price: number;
};

export type ReviewV1 = {
  id: string;
  userId: string;
  destinationId: string;
  rating: number;
  review: string;
  images: string[];
  verified: boolean;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = "wandr_phase1_access";
const REFRESH_KEY = "wandr_phase1_refresh";

export function getPhase1Tokens(): Partial<Tokens> {
  return {
    accessToken: localStorage.getItem(ACCESS_KEY) ?? undefined,
    refreshToken: localStorage.getItem(REFRESH_KEY) ?? undefined,
  };
}

export function setPhase1Tokens(tokens: Partial<Tokens>) {
  if (tokens.accessToken) localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearPhase1Tokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class Phase1ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "Phase1ApiError";
  }
}

export async function phase1Fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken } = getPhase1Tokens();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`/api/v1${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error?.message ?? data?.error ?? `Request failed (${res.status})`;
    throw new Phase1ApiError(res.status, message);
  }
  return data as T;
}

export function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}
