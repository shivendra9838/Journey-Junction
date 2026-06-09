import { AppError } from "../../shared/errors";
import { getPagination, paged } from "../../shared/pagination";
import { slugify } from "../../shared/slug";
import { activityRepository } from "../activities/activity.repository";
import { hotelRepository } from "../hotels/hotel.repository";
import { destinationRepository } from "./destination.repository";

type DestinationInput = {
  name: string;
  slug?: string;
  state: string;
  region: string;
  description: string;
  heroImage: string;
  gallery?: string[];
  bestTime?: string;
  temperature?: string;
  language?: string;
  currency?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
};

const filtersFrom = (query: Record<string, unknown>) => {
  const filters: Record<string, unknown> = {};
  if (query.q) filters.$text = { $search: String(query.q) };
  if (query.state) filters.state = new RegExp(`^${String(query.state)}$`, "i");
  if (query.region) filters.region = new RegExp(`^${String(query.region)}$`, "i");
  if (query.minRating) filters.rating = { $gte: Number(query.minRating) };
  return filters;
};

const withLocation = (input: DestinationInput) => ({
  ...input,
  slug: input.slug ? slugify(input.slug) : slugify(input.name),
  location: {
    type: "Point" as const,
    coordinates: [input.longitude ?? 0, input.latitude ?? 0],
  },
});

export const destinationService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = getPagination(query);
    const filters = filtersFrom(query);
    const [items, total] = await Promise.all([
      destinationRepository.list(filters, skip, limit),
      destinationRepository.count(filters),
    ]);
    return paged(items, total, page, limit);
  },

  async create(input: DestinationInput) {
    const destination = await destinationRepository.create(withLocation(input));
    return { destination };
  },

  async update(id: string, input: Partial<DestinationInput>) {
    const payload =
      input.name || input.slug || input.latitude !== undefined || input.longitude !== undefined
        ? withLocation(input as DestinationInput)
        : input;
    const destination = await destinationRepository.update(id, payload);
    if (!destination) throw new AppError(404, "Destination not found");
    return { destination };
  },

  async remove(id: string) {
    const destination = await destinationRepository.remove(id);
    if (!destination) throw new AppError(404, "Destination not found");
    return { success: true };
  },

  async detail(slug: string) {
    const destination = await destinationRepository.findBySlug(slug);
    if (!destination) throw new AppError(404, "Destination not found");
    const [nearbyDestinations, activities, hotels] = await Promise.all([
      destinationRepository.findNearby(destination.id, destination.state, destination.region),
      activityRepository.byDestination(destination.id),
      hotelRepository.byDestination(destination.id),
    ]);
    return {
      destination,
      nearbyDestinations,
      activities,
      hotels,
      weather: {
        summary: destination.temperature || "Weather data unavailable",
        bestTime: destination.bestTime,
        source: "destination_profile",
      },
    };
  },
};
