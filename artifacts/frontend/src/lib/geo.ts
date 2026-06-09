export type Coordinates = { latitude: number; longitude: number };

const DESTINATION_COORDINATES: Record<string, Coordinates> = {
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  delhi: { latitude: 28.6139, longitude: 77.209 },
  goa: { latitude: 15.2993, longitude: 74.124 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  rajasthan: { latitude: 26.9124, longitude: 75.7873 },
  kerala: { latitude: 9.9312, longitude: 76.2673 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  kashmir: { latitude: 34.0837, longitude: 74.7973 },
  srinagar: { latitude: 34.0837, longitude: 74.7973 },
  uttarakhand: { latitude: 30.0668, longitude: 79.0193 },
  dehradun: { latitude: 30.3165, longitude: 78.0322 },
  rishikesh: { latitude: 30.0869, longitude: 78.2676 },
  haridwar: { latitude: 29.9457, longitude: 78.1642 },
  kedarnath: { latitude: 30.7352, longitude: 79.0669 },
  badrinath: { latitude: 30.7433, longitude: 79.4938 },
  himachal: { latitude: 31.1048, longitude: 77.1734 },
  "himachal-pradesh": { latitude: 31.1048, longitude: 77.1734 },
  shimla: { latitude: 31.1048, longitude: 77.1734 },
  agra: { latitude: 27.1767, longitude: 78.0081 },
  ayodhya: { latitude: 26.7922, longitude: 82.1998 },
  varanasi: { latitude: 25.3176, longitude: 82.9739 },
  prayagraj: { latitude: 25.4358, longitude: 81.8463 },
  mathura: { latitude: 27.4924, longitude: 77.6737 },
  meghalaya: { latitude: 25.467, longitude: 91.3662 },
  shillong: { latitude: 25.5788, longitude: 91.8933 },
};

const INDIA_CENTER: Coordinates = { latitude: 22.9734, longitude: 78.6569 };

function key(value: unknown) {
  return String(value ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function coordinatesForDestination(destination: {
  latitude?: number | null;
  longitude?: number | null;
  slug?: string | null;
  id?: string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  stateSlug?: string | null;
}): Coordinates {
  if (Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude)) {
    return { latitude: Number(destination.latitude), longitude: Number(destination.longitude) };
  }
  const keys = [destination.slug, destination.id, destination.city, destination.name, destination.stateSlug, destination.state].map(key);
  for (const item of keys) {
    if (item && DESTINATION_COORDINATES[item]) return DESTINATION_COORDINATES[item];
  }
  return INDIA_CENTER;
}

